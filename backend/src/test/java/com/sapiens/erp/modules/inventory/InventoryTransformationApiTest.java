package com.sapiens.erp.modules.inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.inventory.api.dto.EntryRequest;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Transformaciones — API REST")
class InventoryTransformationApiTest {

    private static final String BASE = "/api/v1/inventory/transformations";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;
    @Autowired InventoryService inventoryService;
    @Autowired ProductRepository productRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired WarehouseRepository warehouseRepository;

    private RequestPostProcessor operador;
    private UUID bodegaId;
    private Category categoria;

    @BeforeEach
    void setUp() {
        operador = user("operador").authorities(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("INVENTORY_ADJUSTMENT"));
        bodegaId = warehouseRepository.findAll().stream().findFirst()
                .map(Warehouse::getId).orElseGet(() -> {
                    Warehouse w = new Warehouse();
                    w.setId(UUID.randomUUID());
                    w.setName("Bodega API " + UUID.randomUUID());
                    return warehouseRepository.save(w).getId();
                });
        categoria = categoryRepository.findAll().stream().findFirst().orElseGet(() -> {
            Category c = new Category();
            c.setId(UUID.randomUUID());
            c.setName("Cat " + UUID.randomUUID());
            return categoryRepository.save(c);
        });
    }

    private Product producto(String nombre, String precio) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setName(nombre + " " + UUID.randomUUID().toString().substring(0, 6));
        p.setSku("A-" + UUID.randomUUID().toString().substring(0, 8));
        p.setCategory(categoria);
        p.setUnitOfMeasure(UnitOfMeasure.KG);
        p.setMinimumStock(BigDecimal.ZERO);
        p.setSalePrice(new BigDecimal(precio));
        p.setBaseUnitFactor(BigDecimal.ONE);
        return productRepository.save(p);
    }

    private JsonNode enviar(String url, Object body) throws Exception {
        var r = mockMvc.perform(post(url).with(operador).contentType(MediaType.APPLICATION_JSON)
                        .content(body == null ? "{}" : mapper.writeValueAsString(body)))
                .andReturn().getResponse();
        assertThat(r.getStatus()).as("POST %s -> %s", url, r.getContentAsString()).isIn(200, 201);
        return mapper.readTree(r.getContentAsString());
    }

    @Test
    @DisplayName("Ciclo completo por HTTP: crear, capturar, confirmar y anular")
    void cicloCompletoPorHttp() throws Exception {
        Product atun = producto("Atún", "20000");
        Product filete = producto("Filete", "60000");
        Product recortes = producto("Recortes", "10000");
        inventoryService.registerEntry(new EntryRequest(atun.getId(), new BigDecimal("20"),
                new BigDecimal("18000"), LocalDate.now(), null, null, null, "test", bodegaId));

        var doc = enviar(BASE, java.util.Map.of(
                "transformationDate", LocalDate.now().toString(),
                "warehouseId", bodegaId.toString(),
                "notes", "prueba API"));

        String id = doc.get("id").asText();
        assertThat(doc.get("number").asText()).startsWith("TR-");
        assertThat(doc.get("status").asText()).isEqualTo("DRAFT");
        assertThat(doc.get("costMethodNotice").asText())
                .as("la advertencia de margen viaja en cada respuesta")
                .contains("margen porcentual uniforme");

        enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "CONSUMED", "productId", atun.getId().toString(), "quantity", 20));
        enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "OBTAINED", "productId", filete.getId().toString(), "quantity", 11));
        enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "OBTAINED", "productId", recortes.getId().toString(), "quantity", 4));
        var conMerma = enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "OBTAINED", "lineKind", "WASTE",
                "productId", atun.getId().toString(), "quantity", 5));

        assertThat(conMerma.get("consumed")).hasSize(1);
        assertThat(conMerma.get("obtained")).hasSize(3);

        var confirmada = enviar(BASE + "/" + id + "/confirm", null);
        assertThat(confirmada.get("status").asText()).isEqualTo("CONFIRMED");
        assertThat(confirmada.get("costingStatus").asText()).isEqualTo("COSTED");
        // 15 kg aprovechables de 20 consumidos
        assertThat(confirmada.get("yieldPercentage").asDouble()).isEqualTo(75.0);
        assertThat(confirmada.get("wastePercentage").asDouble()).isEqualTo(25.0);

        // El costo repartido tiene que sumar exactamente el consumido
        double costo = confirmada.get("inputTotalCost").asDouble();
        double repartido = 0;
        for (JsonNode l : confirmada.get("obtained")) {
            if (!l.get("allocatedCost").isNull()) repartido += l.get("allocatedCost").asDouble();
        }
        assertThat(repartido).isEqualTo(costo);

        // Los movimientos quedan atados al documento
        var movs = mockMvc.perform(get(BASE + "/" + id + "/movements").with(operador))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(mapper.readTree(movs)).hasSize(3);   // 1 salida + 2 entradas (la merma no entra)

        var anulada = enviar(BASE + "/" + id + "/cancel",
                java.util.Map.of("reason", "prueba de anulación"));
        assertThat(anulada.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(anulada.get("cancelReason").asText()).isEqualTo("prueba de anulación");
    }

    @Test
    @DisplayName("Anular sin motivo se rechaza con 400")
    void anularSinMotivo() throws Exception {
        var doc = enviar(BASE, java.util.Map.of("warehouseId", bodegaId.toString()));
        mockMvc.perform(post(BASE + "/" + doc.get("id").asText() + "/cancel").with(operador)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Sin permiso de inventario se rechaza")
    void sinPermisoSeRechaza() throws Exception {
        mockMvc.perform(post(BASE).with(user("curioso").authorities(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("CATALOG_VIEW")))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("La advertencia de stock negativo aparece sin bloquear")
    void advertenciaDeStockNegativo() throws Exception {
        Product atun = producto("Atún escaso", "20000");
        Product filete = producto("Filete", "60000");
        inventoryService.registerEntry(new EntryRequest(atun.getId(), new BigDecimal("8"),
                new BigDecimal("18000"), LocalDate.now(), null, null, null, "test", bodegaId));

        var doc = enviar(BASE, java.util.Map.of("warehouseId", bodegaId.toString()));
        String id = doc.get("id").asText();
        enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "CONSUMED", "productId", atun.getId().toString(), "quantity", 10));
        var conLineas = enviar(BASE + "/" + id + "/lines", java.util.Map.of(
                "side", "OBTAINED", "productId", filete.getId().toString(), "quantity", 7));

        boolean avisa = false;
        for (JsonNode w : conLineas.get("warnings")) {
            if ("NEGATIVE_STOCK".equals(w.get("code").asText())) {
                avisa = true;
                assertThat(w.get("message").asText()).contains("-2");
            }
        }
        assertThat(avisa).as("debe advertir la existencia negativa").isTrue();

        // Advierte, pero deja continuar
        var confirmada = enviar(BASE + "/" + id + "/confirm", null);
        assertThat(confirmada.get("status").asText()).isEqualTo("CONFIRMED");
    }
}
