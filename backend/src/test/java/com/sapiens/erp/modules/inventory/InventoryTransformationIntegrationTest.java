package com.sapiens.erp.modules.inventory;

import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.inventory.api.dto.EntryRequest;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import com.sapiens.erp.modules.inventory.application.InventoryTransformationService;
import com.sapiens.erp.modules.inventory.domain.*;
import com.sapiens.erp.modules.inventory.domain.exception.TransformationValidationException;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Flujo completo contra base de datos real. Sin @Transactional en la clase:
 * cada confirmación tiene que hacer commit de verdad para poder comprobar que
 * el rollback funciona cuando toca.
 */
@SpringBootTest
@DisplayName("Transformaciones — flujo completo")
class InventoryTransformationIntegrationTest {

    @Autowired InventoryTransformationService service;
    @Autowired InventoryService inventoryService;
    @Autowired ProductRepository productRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired WarehouseRepository warehouseRepository;
    @Autowired InventoryMovementRepository movementRepository;

    private Warehouse bodega;
    private Category categoria;

    @BeforeEach
    void setUp() {
        bodega = warehouseRepository.findAll().stream().findFirst().orElseGet(() -> {
            Warehouse w = new Warehouse();
            w.setId(UUID.randomUUID());
            w.setName("Bodega de prueba");
            return warehouseRepository.save(w);
        });
        categoria = categoryRepository.findAll().stream().findFirst().orElseGet(() -> {
            Category c = new Category();
            c.setId(UUID.randomUUID());
            c.setName("Pescados " + UUID.randomUUID());
            return categoryRepository.save(c);
        });
    }

    /* ── Utilidades ──────────────────────────────────────────────────────── */

    private Product producto(String nombre, String precioVenta) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setName(nombre + " " + UUID.randomUUID().toString().substring(0, 6));
        p.setSku("T-" + UUID.randomUUID().toString().substring(0, 8));
        p.setCategory(categoria);
        p.setUnitOfMeasure(UnitOfMeasure.KG);
        p.setMinimumStock(BigDecimal.ZERO);
        p.setSalePrice(precioVenta == null ? null : new BigDecimal(precioVenta));
        p.setBaseUnitFactor(BigDecimal.ONE);   // 1 kg = 1 unidad base
        return productRepository.save(p);
    }

    private void ingresar(Product p, String cantidad, String costo) {
        inventoryService.registerEntry(new EntryRequest(
                p.getId(), new BigDecimal(cantidad), new BigDecimal(costo),
                LocalDate.now(), null, null, null, "test", bodega.getId()));
    }

    private BigDecimal stock(Product p) {
        return movementRepository.calculateCurrentStock(p.getId());
    }

    /* ── TEST 1 · Atomicidad ─────────────────────────────────────────────── */

    @Test
    @DisplayName("TEST 1 — un fallo a mitad no deja inventario ni documento a medias")
    void fallaAMitadYNoDejaNadaPersistido() {
        Product atun = producto("Atún entero", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "20", "18000");

        BigDecimal atunAntes = stock(atun);
        BigDecimal fileteAntes = stock(filete);

        var t = service.createDraft(LocalDate.now(), bodega.getId(), "prueba atómica", "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        // Falta el lado obtenido a propósito: la validación debe detenerlo
        // DESPUÉS de que el servicio empezó, y no dejar rastro.

        assertThatThrownBy(() -> service.confirm(t.id(), "test"))
                .isInstanceOf(TransformationValidationException.class);

        assertThat(stock(atun)).as("el atún no se tocó").isEqualByComparingTo(atunAntes);
        assertThat(stock(filete)).as("el filete no se tocó").isEqualByComparingTo(fileteAntes);

        // El documento no quedó confirmado a medias
        assertThat(service.get(t.id()).status()).isEqualTo("DRAFT");

        long movimientos = movementRepository.findAll().stream()
                .filter(m -> t.id().equals(m.getSourceId())).count();
        assertThat(movimientos).as("ningún movimiento huérfano").isZero();
    }

    /* ── TEST 4 · Anulación ──────────────────────────────────────────────── */

    @Test
    @DisplayName("TEST 4 — anular devuelve el inventario al punto de partida")
    void anularRevierteElInventario() {
        Product atun = producto("Atún entero", "20000");
        Product filete = producto("Filete", "50000");
        Product recortes = producto("Recortes", "10000");
        ingresar(atun, "20", "18000");

        var t = service.createDraft(LocalDate.now(), bodega.getId(), "prueba anulación", "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("6"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                recortes.getId(), new BigDecimal("2"));

        var confirmada = service.confirm(t.id(), "test");

        assertThat(confirmada.status()).isEqualTo("CONFIRMED");
        assertThat(stock(atun)).isEqualByComparingTo("10");
        assertThat(stock(filete)).isEqualByComparingTo("6");
        assertThat(stock(recortes)).isEqualByComparingTo("2");

        var anulada = service.cancel(t.id(), "error de captura", "test");

        assertThat(anulada.status()).isEqualTo("CANCELLED");
        assertThat(anulada.cancelReason()).isEqualTo("error de captura");
        assertThat(anulada.cancelledBy()).isEqualTo("test");
        assertThat(stock(atun)).as("el atún vuelve").isEqualByComparingTo("20");
        assertThat(stock(filete)).as("el filete se retira").isEqualByComparingTo("0");
        assertThat(stock(recortes)).as("los recortes se retiran").isEqualByComparingTo("0");

        long reversiones = movementRepository.findAll().stream()
                .filter(m -> MovementSourceType.INVENTORY_TRANSFORMATION_REVERSAL.equals(m.getSourceType()))
                .filter(m -> t.id().equals(m.getSourceId())).count();
        assertThat(reversiones).as("hay movimientos de reversión auditables").isEqualTo(3);
    }

    @Test
    @DisplayName("Anular dos veces se rechaza")
    void anularDosVecesSeRechaza() {
        var t = transformacionConfirmada();
        service.cancel(t.id(), "primera", "test");
        assertThatThrownBy(() -> service.cancel(t.id(), "segunda", "test"))
                .isInstanceOf(TransformationValidationException.class)
                .hasMessageContaining("ya está anulada");
    }

    @Test
    @DisplayName("Confirmar dos veces se rechaza")
    void confirmarDosVecesSeRechaza() {
        var t = transformacionConfirmada();
        assertThatThrownBy(() -> service.confirm(t.id(), "test"))
                .isInstanceOf(TransformationValidationException.class)
                .hasMessageContaining("borrador");
    }

    @Test
    @DisplayName("Un documento confirmado no se puede editar")
    void confirmadoNoSeEdita() {
        var t = transformacionConfirmada();
        Product otro = producto("Otro", "1000");
        assertThatThrownBy(() -> service.addLine(t.id(), TransformationSide.OBTAINED,
                TransformationLineKind.PRODUCT, otro.getId(), BigDecimal.ONE))
                .isInstanceOf(TransformationValidationException.class)
                .hasMessageContaining("no se puede editar");
    }

    /* ── Stock negativo y rendimiento ────────────────────────────────────── */

    @Test
    @DisplayName("Se permite dejar existencia negativa")
    void permiteExistenciaNegativa() {
        Product atun = producto("Atún escaso", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "8", "18000");

        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("7"));

        var c = service.confirm(t.id(), "test");

        assertThat(c.status()).isEqualTo("CONFIRMED");
        assertThat(stock(atun)).as("queda en negativo, como señal de conteo")
                .isEqualByComparingTo("-2");
        // Se consumió más de lo que respaldaban los lotes: no hay costo real.
        assertThat(c.costingStatus()).isEqualTo("UNCOSTED");
        assertThat(c.inputTotalCost()).isNull();
    }

    @Test
    @DisplayName("Se permite rendimiento superior al 100%")
    void permiteRendimientoSobreCien() {
        Product atun = producto("Atún", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "20", "18000");

        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("11"));

        var c = service.confirm(t.id(), "test");

        assertThat(c.status()).isEqualTo("CONFIRMED");
        assertThat(c.yieldPercentage()).isEqualByComparingTo("110.0000");
    }

    @Test
    @DisplayName("El rendimiento descuenta la merma y cuadra")
    void rendimientoConMerma() {
        Product atun = producto("Atún", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "40", "18000");

        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("20"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("17"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.WASTE,
                atun.getId(), new BigDecimal("3"));

        var c = service.confirm(t.id(), "test");

        assertThat(c.yieldPercentage()).isEqualByComparingTo("85.0000");
        assertThat(c.wastePercentage()).isEqualByComparingTo("15.0000");
        // La merma NO entra al inventario: solo el filete subió.
        assertThat(stock(filete)).isEqualByComparingTo("17");
    }

    /* ── Validaciones ────────────────────────────────────────────────────── */

    @Test
    @DisplayName("Lado consumido vacío se rechaza")
    void consumidoVacio() {
        Product filete = producto("Filete", "50000");
        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("6"));
        assertThatThrownBy(() -> service.confirm(t.id(), "test"))
                .hasMessageContaining("consumido");
    }

    @Test
    @DisplayName("Solo merma del lado obtenido se rechaza")
    void soloMermaNoBasta() {
        Product atun = producto("Atún", "20000");
        ingresar(atun, "10", "18000");
        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("5"));
        Product otro = producto("Espinas", "0");
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.WASTE,
                otro.getId(), new BigDecimal("5"));
        assertThatThrownBy(() -> service.confirm(t.id(), "test"))
                .hasMessageContaining("merma sola no basta");
    }

    @Test
    @DisplayName("Cantidad cero o negativa se rechaza al capturar")
    void cantidadInvalida() {
        Product atun = producto("Atún", "20000");
        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        assertThatThrownBy(() -> service.addLine(t.id(), TransformationSide.CONSUMED,
                TransformationLineKind.PRODUCT, atun.getId(), BigDecimal.ZERO))
                .hasMessageContaining("mayor que cero");
        assertThatThrownBy(() -> service.addLine(t.id(), TransformationSide.CONSUMED,
                TransformationLineKind.PRODUCT, atun.getId(), new BigDecimal("-5")))
                .hasMessageContaining("mayor que cero");
    }

    @Test
    @DisplayName("El mismo producto consumido y obtenido se rechaza")
    void mismoProductoEnAmbosLados() {
        Product atun = producto("Atún", "20000");
        ingresar(atun, "20", "18000");
        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("8"));
        assertThatThrownBy(() -> service.confirm(t.id(), "test"))
                .hasMessageContaining("no puede estar consumido y obtenido");
    }

    /* ── Snapshots ───────────────────────────────────────────────────────── */

    @Test
    @DisplayName("Renombrar el producto no cambia el documento histórico")
    void elSnapshotSobreviveAlRenombrado() {
        Product atun = producto("Atún entero", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "20", "18000");
        String nombreOriginal = atun.getName();
        String codigoOriginal = atun.getSku();
        BigDecimal precioOriginal = filete.getSalePrice();

        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("6"));
        var c = service.confirm(t.id(), "test");

        // Seis meses después: cambia el nombre y el precio
        atun.setName("Atún aleta amarilla " + UUID.randomUUID());
        productRepository.save(atun);
        filete.setSalePrice(new BigDecimal("99999"));
        productRepository.save(filete);

        var linea = c.consumed().get(0);
        assertThat(linea.productName()).isEqualTo(nombreOriginal);
        assertThat(linea.productCode()).isEqualTo(codigoOriginal);

        var salida = c.obtained().stream().filter(l -> "PRODUCT".equals(l.lineKind())).findFirst().orElseThrow();
        assertThat(salida.referenceSalePrice()).isEqualByComparingTo(precioOriginal);
    }

    /* ── Ayuda ───────────────────────────────────────────────────────────── */

    private com.sapiens.erp.modules.inventory.api.dto.TransformationDtos.TransformationResponse transformacionConfirmada() {
        Product atun = producto("Atún", "20000");
        Product filete = producto("Filete", "50000");
        ingresar(atun, "20", "18000");
        var t = service.createDraft(LocalDate.now(), bodega.getId(), null, "test");
        service.addLine(t.id(), TransformationSide.CONSUMED, TransformationLineKind.PRODUCT,
                atun.getId(), new BigDecimal("10"));
        service.addLine(t.id(), TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                filete.getId(), new BigDecimal("6"));
        return service.confirm(t.id(), "test");
    }
}
