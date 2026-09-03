package com.sapiens.erp.modules.inventory;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import com.sapiens.erp.modules.inventory.application.TransformationCostAllocator;
import com.sapiens.erp.modules.inventory.domain.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Transformaciones — reparto del costo por valor de venta")
class TransformationCostAllocatorTest {

    private final TransformationCostAllocator allocator = new TransformationCostAllocator();

    private InventoryTransformationLine linea(String nombre, String cantidad, String precio, int orden) {
        Product p = new Product();
        p.setName(nombre);
        p.setSku(nombre.toUpperCase());
        p.setUnitOfMeasure(UnitOfMeasure.KG);
        InventoryTransformationLine l = InventoryTransformationLine.of(
                TransformationSide.OBTAINED, TransformationLineKind.PRODUCT,
                p, new BigDecimal(cantidad), new BigDecimal(cantidad), orden);
        l.setReferenceSalePrice(precio == null ? null : new BigDecimal(precio));
        return l;
    }

    @Test
    @DisplayName("TEST 2 — reparte por valor de venta, no por cantidad")
    void repartePorValorDeVentaNoPorCantidad() {
        // A: 1 kg a $150.000 · B: 10 kg a $5.000
        // Por CANTIDAD, B se llevaría el 91%. Por VALOR, A se lleva el 75%.
        var a = linea("Lomo", "1", "150000", 0);
        var b = linea("Recortes", "10", "5000", 1);

        var r = allocator.allocate(List.of(a, b), new BigDecimal("100000"));

        assertThat(r.status()).isEqualTo(CostingStatus.COSTED);
        assertThat(a.getAllocatedCost()).isEqualByComparingTo("75000");
        assertThat(b.getAllocatedCost()).isEqualByComparingTo("25000");

        // La comprobación que da sentido a la prueba: NO se repartió por peso.
        BigDecimal porCantidad = new BigDecimal("100000")
                .multiply(new BigDecimal("10")).divide(new BigDecimal("11"), 0, java.math.RoundingMode.HALF_UP);
        assertThat(b.getAllocatedCost()).isNotEqualByComparingTo(porCantidad);

        assertThat(a.getResultingUnitCost()).isEqualByComparingTo("75000");
        assertThat(b.getResultingUnitCost()).isEqualByComparingTo("2500");
    }

    @Test
    @DisplayName("TEST 3 — el residuo de redondeo no pierde ni crea dinero")
    void elResiduoSeAsignaCompleto() {
        // $10.003 entre tres partes iguales no es divisible sin residuo
        var a = linea("A", "1", "100", 0);
        var b = linea("B", "1", "100", 1);
        var c = linea("C", "1", "100", 2);

        BigDecimal costo = new BigDecimal("10003");
        allocator.allocate(List.of(a, b, c), costo);

        BigDecimal suma = a.getAllocatedCost().add(b.getAllocatedCost()).add(c.getAllocatedCost());
        assertThat(suma).isEqualByComparingTo(costo);
    }

    @Test
    @DisplayName("El residuo va a la línea de mayor peso")
    void residuoALaLineaDeMayorPeso() {
        var grande = linea("Grande", "1", "200", 0);
        var chica = linea("Chica", "1", "100", 1);

        allocator.allocate(List.of(grande, chica), new BigDecimal("10001"));

        BigDecimal suma = grande.getAllocatedCost().add(chica.getAllocatedCost());
        assertThat(suma).isEqualByComparingTo("10001");
        // 2/3 de 10001 = 6667.3333 -> el ajuste sube, no baja
        assertThat(grande.getAllocatedCost()).isGreaterThan(chica.getAllocatedCost());
    }

    @Test
    @DisplayName("Costo desconocido NO se convierte en cero")
    void costoDesconocidoNoEsCero() {
        var a = linea("Filete", "6", "50000", 0);
        var b = linea("Recortes", "2", "10000", 1);

        var r = allocator.allocate(List.of(a, b), null);

        assertThat(r.status()).isEqualTo(CostingStatus.UNCOSTED);
        assertThat(r.allocatedTotal()).isNull();
        // Lo importante: NULL, no BigDecimal.ZERO. Un cero daría margen del 100%.
        assertThat(a.getAllocatedCost()).isNull();
        assertThat(b.getAllocatedCost()).isNull();
        assertThat(a.getResultingUnitCost()).isNull();
        assertThat(a.getCostingStatus()).isEqualTo(CostingStatus.UNCOSTED);
    }

    @Test
    @DisplayName("Sin precio de referencia en ningún obtenido, queda sin costear")
    void sinPrecioDeReferenciaQuedaSinCostear() {
        var a = linea("Filete", "6", null, 0);
        var b = linea("Recortes", "2", null, 1);

        var r = allocator.allocate(List.of(a, b), new BigDecimal("100000"));

        // Repartir en partes iguales sería inventar una regla que nadie definió.
        assertThat(r.status()).isEqualTo(CostingStatus.UNCOSTED);
        assertThat(a.getAllocatedCost()).isNull();
    }

    @Test
    @DisplayName("La suma repartida siempre cuadra, con cifras difíciles")
    void sumaSiempreCuadra() {
        for (String costo : List.of("10003", "0.01", "999999.9999", "1", "7")) {
            var a = linea("A", "3", "7", 0);
            var b = linea("B", "11", "13", 1);
            var c = linea("C", "17", "19", 2);

            allocator.allocate(List.of(a, b, c), new BigDecimal(costo));
            BigDecimal suma = a.getAllocatedCost().add(b.getAllocatedCost()).add(c.getAllocatedCost());

            assertThat(suma)
                    .as("el reparto de %s debe sumar exactamente %s", costo, costo)
                    .isEqualByComparingTo(new BigDecimal(costo));
        }
    }
}
