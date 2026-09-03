package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.inventory.domain.CostingStatus;
import com.sapiens.erp.modules.inventory.domain.InventoryTransformationLine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

/**
 * Reparte el costo de lo consumido entre lo obtenido, en proporción a su
 * VALOR DE VENTA.
 *
 * <p><b>Advertencia sobre el margen.</b> Este método produce, por diseño, el
 * mismo margen porcentual en todos los productos obtenidos. Sirve para valorar
 * el inventario, NO para decidir cuál corte deja más rentabilidad: esa
 * comparación siempre daría empate y sería una conclusión falsa.
 *
 * <p>No se reparte por peso a propósito. Un kilo de lomo y un kilo de recortes
 * salen del mismo pescado, pero no valen lo mismo; repartir por kilos
 * encarecería los recortes hasta hacerlos parecer invendibles.
 */
@Component
@Slf4j
public class TransformationCostAllocator {

    /** Precisión monetaria del sistema, igual que en el resto de costos. */
    private static final int SCALE = 4;
    private static final MathContext PRECISION = new MathContext(20, RoundingMode.HALF_UP);

    public record Result(CostingStatus status, BigDecimal allocatedTotal) {}

    /**
     * Asigna costo a cada línea obtenida. Modifica las líneas recibidas.
     *
     * @param inputTotalCost costo de lo consumido, o null si algún consumo no
     *                       tenía costo conocido. Un costo desconocido NO se
     *                       trata como cero: se marca el documento y se costea
     *                       después, cuando exista el dato real.
     */
    public Result allocate(List<InventoryTransformationLine> obtained, BigDecimal inputTotalCost) {
        if (obtained.isEmpty()) {
            return new Result(CostingStatus.PENDING, BigDecimal.ZERO);
        }

        // ── Sin costo conocido: se marca, no se inventa ─────────────────────
        if (inputTotalCost == null) {
            obtained.forEach(l -> {
                l.setAllocationWeight(null);
                l.setAllocatedCost(null);
                l.setResultingUnitCost(null);
                l.setCostingStatus(CostingStatus.UNCOSTED);
            });
            return new Result(CostingStatus.UNCOSTED, null);
        }

        // ── Valor de venta de cada línea, con el precio congelado ───────────
        BigDecimal saleTotal = BigDecimal.ZERO;
        for (InventoryTransformationLine l : obtained) {
            BigDecimal price = l.getReferenceSalePrice();
            BigDecimal value = price == null
                    ? BigDecimal.ZERO
                    : price.multiply(l.getQuantity());
            l.setSaleValue(value.setScale(SCALE, RoundingMode.HALF_UP));
            saleTotal = saleTotal.add(value);
        }

        // Sin valor de venta no hay proporción posible: repartir en partes
        // iguales sería inventar una regla que nadie definió.
        if (saleTotal.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Ningún producto obtenido tiene precio de referencia: el documento queda sin costear");
            obtained.forEach(l -> {
                l.setAllocationWeight(null);
                l.setAllocatedCost(null);
                l.setResultingUnitCost(null);
                l.setCostingStatus(CostingStatus.UNCOSTED);
            });
            return new Result(CostingStatus.UNCOSTED, null);
        }

        // ── Reparto ────────────────────────────────────────────────────────
        BigDecimal allocatedTotal = BigDecimal.ZERO;
        for (InventoryTransformationLine l : obtained) {
            BigDecimal weight = l.getSaleValue().divide(saleTotal, PRECISION);
            BigDecimal cost = inputTotalCost.multiply(weight, PRECISION)
                    .setScale(SCALE, RoundingMode.HALF_UP);

            l.setAllocationWeight(weight.setScale(9, RoundingMode.HALF_UP));
            l.setAllocatedCost(cost);
            l.setCostingStatus(CostingStatus.COSTED);
            allocatedTotal = allocatedTotal.add(cost);
        }

        // ── Residuo de redondeo ────────────────────────────────────────────
        // Redondear cada línea por separado hace que la suma no cuadre con el
        // costo consumido: aparecen o desaparecen centavos. El inventario
        // quedaría valorado por un total distinto al que de verdad se gastó,
        // así que la diferencia se asigna entera a la línea de mayor peso.
        BigDecimal residual = inputTotalCost.setScale(SCALE, RoundingMode.HALF_UP)
                .subtract(allocatedTotal);

        if (residual.compareTo(BigDecimal.ZERO) != 0) {
            InventoryTransformationLine target = obtained.stream()
                    // Empate exacto: gana el primero según el orden de captura,
                    // para que el resultado sea el mismo en cada ejecución.
                    .max(Comparator.comparing(InventoryTransformationLine::getAllocationWeight)
                            .thenComparing(Comparator.comparing(
                                    InventoryTransformationLine::getDisplayOrder).reversed()))
                    .orElseThrow();

            target.setAllocatedCost(target.getAllocatedCost().add(residual));
            allocatedTotal = allocatedTotal.add(residual);
            log.debug("Residuo de redondeo {} asignado a la línea {}", residual, target.getProductName());
        }

        // ── Costo unitario resultante ──────────────────────────────────────
        for (InventoryTransformationLine l : obtained) {
            l.setResultingUnitCost(
                    l.getAllocatedCost().divide(l.getQuantity(), SCALE, RoundingMode.HALF_UP));
        }

        return new Result(CostingStatus.COSTED, allocatedTotal);
    }
}
