package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import com.sapiens.erp.modules.inventory.application.InventoryService.LotConsumption;
import com.sapiens.erp.modules.inventory.domain.*;
import com.sapiens.erp.modules.inventory.api.dto.MovementResponse;
import com.sapiens.erp.modules.inventory.api.dto.TransformationDtos.*;
import com.sapiens.erp.modules.inventory.domain.exception.TransformationValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Transformaciones de inventario: consumir materia prima y obtener producto
 * terminado en una sola operación documentada.
 *
 * <p><b>Atomicidad.</b> Confirmar y anular ocurren dentro de UNA transacción.
 * Una transformación a medias dejaría el inventario mostrando a la vez el atún
 * entero y el filete, duplicando mercancía que no existe. Por eso cualquier
 * fallo revierte todo: no hay commits intermedios.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryTransformationService {

    private static final int PCT_SCALE = 4;

    private final InventoryTransformationRepository transformationRepository;
    private final InventoryMovementRepository movementRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final LotRepository lotRepository;
    private final InventoryService inventoryService;
    private final TransformationCostAllocator costAllocator;
    private final TransformationUnitConverter unitConverter;

    /* ── Creación del borrador ───────────────────────────────────────────── */

    @Transactional
    public TransformationResponse createDraft(LocalDate date, UUID warehouseId, String notes,
                                              String user) {
        Warehouse warehouse = warehouseId == null ? null
                : warehouseRepository.findById(warehouseId).orElse(null);

        InventoryTransformation t = InventoryTransformation.draft(
                nextNumber(), date != null ? date : LocalDate.now(), warehouse, notes, user);
        return describe(transformationRepository.save(t).getId());
    }

    @Transactional
    public InventoryTransformationLine addLine(UUID transformationId, TransformationSide side,
                                               TransformationLineKind kind, UUID productId,
                                               BigDecimal quantity) {
        InventoryTransformation t = requireEditable(transformationId);
        Product product = productRepository.findById(productId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new TransformationValidationException(
                    "La cantidad de " + product.getName() + " debe ser mayor que cero");
        }

        int order = t.linesOf(side).size();
        InventoryTransformationLine line = InventoryTransformationLine.of(
                side, kind, product, quantity, unitConverter.toBase(product, quantity), order);

        // El precio se congela AL CAPTURAR, no al confirmar: si cambia entre
        // una cosa y otra, el documento debe reflejar lo que se vio al armarlo.
        if (side == TransformationSide.OBTAINED && kind == TransformationLineKind.PRODUCT) {
            line.setReferenceSalePrice(product.getSalePrice());
        }

        t.addLine(line);
        transformationRepository.save(t);
        return line;
    }

    /** Quita un renglón del borrador. Un confirmado no se toca. */
    @Transactional
    public void removeLine(UUID transformationId, UUID lineId) {
        InventoryTransformation t = requireEditable(transformationId);
        boolean removed = t.getLines().removeIf(l -> l.getId().equals(lineId));
        if (!removed) {
            throw new TransformationValidationException("Renglón no encontrado: " + lineId);
        }
        transformationRepository.save(t);
    }

    /* ── Confirmación ────────────────────────────────────────────────────── */

    /**
     * Genera todos los movimientos y cierra el documento. Todo o nada.
     *
     * <p>El orden importa: primero se valida y se calcula, y solo después se
     * escribe. Así un documento inválido no alcanza a tocar el inventario.
     */
    @Transactional
    public TransformationResponse confirm(UUID transformationId, String user) {
        // Candado de fila: sin él dos peticiones podrían confirmar el mismo
        // borrador a la vez y duplicar el inventario.
        InventoryTransformation t = transformationRepository.findByIdForUpdate(transformationId)
                .orElseThrow(() -> new TransformationValidationException(
                        "Transformación no encontrada: " + transformationId));

        if (t.getStatus() != TransformationStatus.DRAFT) {
            throw new TransformationValidationException(
                    "Solo un borrador se puede confirmar (estado actual: " + t.getStatus() + ")");
        }
        validateStructure(t);

        Warehouse location = t.getWarehouse();

        // ── 1. Consumir y costear ──────────────────────────────────────────
        BigDecimal inputTotalCost = BigDecimal.ZERO;
        boolean costKnown = true;
        Map<UUID, List<LotConsumption>> consumedLots = new LinkedHashMap<>();

        for (InventoryTransformationLine line : t.linesOf(TransformationSide.CONSUMED)) {
            List<LotConsumption> consumptions = inventoryService.consumeForTransformation(
                    line.getProduct(), line.getQuantity(), location);
            consumedLots.put(line.getId(), consumptions);

            BigDecimal consumedQty = consumptions.stream()
                    .map(LotConsumption::quantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal lineCost = BigDecimal.ZERO;
            boolean lineCostKnown = true;

            for (LotConsumption c : consumptions) {
                BigDecimal price = c.lot().getPurchasePrice();
                if (price == null) { lineCostKnown = false; break; }
                lineCost = lineCost.add(price.multiply(c.quantity()));
            }

            // Si se consumió más de lo que había en lotes, la diferencia no
            // tiene costo respaldado. Inventarlo con cero produciría un margen
            // falso, así que el documento entero queda sin costear.
            if (consumedQty.compareTo(line.getQuantity()) < 0) {
                lineCostKnown = false;
                log.warn("La transformación {} deja existencia negativa de {}",
                        t.getNumber(), line.getProductName());
            }

            if (lineCostKnown) {
                line.setTotalCost(lineCost.setScale(4, RoundingMode.HALF_UP));
                line.setUnitCost(lineCost.divide(line.getQuantity(), 4, RoundingMode.HALF_UP));
                line.setCostingStatus(CostingStatus.COSTED);
                inputTotalCost = inputTotalCost.add(lineCost);
            } else {
                line.setTotalCost(null);
                line.setUnitCost(null);
                line.setCostingStatus(CostingStatus.UNCOSTED);
                costKnown = false;
            }
        }

        // ── 2. Repartir el costo entre lo obtenido ─────────────────────────
        List<InventoryTransformationLine> obtained = t.obtainedProducts();
        var allocation = costAllocator.allocate(obtained, costKnown ? inputTotalCost : null);

        // La merma no entra al inventario ni recibe costo: es lo que se perdió.
        t.wasteLines().forEach(w -> {
            w.setAllocatedCost(null);
            w.setResultingUnitCost(null);
            w.setCostingStatus(CostingStatus.PENDING);
        });

        // ── 3. Movimientos de salida ───────────────────────────────────────
        for (InventoryTransformationLine line : t.linesOf(TransformationSide.CONSUMED)) {
            InventoryMovement m = InventoryMovement.create(
                    line.getProduct(), MovementType.EXIT,
                    line.getQuantity(), line.getUnitCost(),
                    null, null,
                    location, null,
                    "Transformación " + t.getNumber(), null, user);
            m.linkTo(MovementSourceType.INVENTORY_TRANSFORMATION, t.getId());
            movementRepository.save(m);
            inventoryService.linkMovementLots(m, consumedLots.get(line.getId()));
        }

        // ── 4. Movimientos de entrada y lotes nuevos ───────────────────────
        for (InventoryTransformationLine line : obtained) {
            Product product = line.getProduct();
            BigDecimal unitCost = line.getResultingUnitCost();

            // Sin costo conocido el inventario FÍSICO igual se actualiza, pero
            // no se toca la valoración: un promedio calculado con cero sería
            // peor que no calcularlo.
            BigDecimal prevAvg = null;
            if (unitCost != null) {
                BigDecimal stockBefore = movementRepository.calculateCurrentStock(product.getId());
                prevAvg = product.applyEntryAndRecalculateCost(
                        stockBefore, line.getQuantity(), unitCost);
                productRepository.save(product);
            }

            Lot lot = Lot.create(product, line.getQuantity(),
                    unitCost != null ? unitCost : BigDecimal.ZERO,
                    t.getTransformationDate(), null,
                    t.getNumber(), "Generado por transformación " + t.getNumber(), location);
            lotRepository.save(lot);
            line.setLotId(lot.getId());

            InventoryMovement m = InventoryMovement.create(
                    product, MovementType.ENTRY,
                    line.getQuantity(), unitCost,
                    prevAvg, product.getAverageCost(),
                    null, location,
                    "Transformación " + t.getNumber(), null, user);
            m.linkTo(MovementSourceType.INVENTORY_TRANSFORMATION, t.getId());
            movementRepository.save(m);
        }

        // ── 5. Rendimiento y cierre ────────────────────────────────────────
        Yield yield = calculateYield(t);
        t.confirm(user, costKnown ? inputTotalCost.setScale(4, RoundingMode.HALF_UP) : null,
                allocation.status(), yield.yieldPct(), yield.wastePct());

        log.info("Transformación {} confirmada por {} · costo {} · rendimiento {}",
                t.getNumber(), user, t.getInputTotalCost(), yield.yieldPct());

        transformationRepository.save(t);
        // Se relee con su grafo antes de mapear: la consulta con candado no
        // trae el almacén, y con open-in-view apagado el proxy perezoso no
        // resuelve. Mapear sobre el resultado del candado revienta.
        return describe(t.getId());
    }

    /* ── Anulación ───────────────────────────────────────────────────────── */

    /**
     * Revierte con movimientos inversos. No borra: el documento queda entero
     * con su rastro, porque el histórico tiene que poder explicar qué pasó.
     *
     * <p>No se bloquea si lo obtenido ya se vendió. La existencia quedará
     * negativa y eso es la señal correcta: se produjo algo que no debió
     * producirse y hay que contar.
     */
    @Transactional
    public TransformationResponse cancel(UUID transformationId, String reason, String user) {
        if (reason == null || reason.isBlank()) {
            throw new TransformationValidationException("La anulación exige un motivo");
        }

        InventoryTransformation t = transformationRepository.findByIdForUpdate(transformationId)
                .orElseThrow(() -> new TransformationValidationException(
                        "Transformación no encontrada: " + transformationId));

        if (t.getStatus() == TransformationStatus.CANCELLED) {
            throw new TransformationValidationException(
                    "La transformación " + t.getNumber() + " ya está anulada");
        }
        if (t.getStatus() != TransformationStatus.CONFIRMED) {
            throw new TransformationValidationException(
                    "Solo una transformación confirmada se puede anular (estado: " + t.getStatus() + ")");
        }

        Warehouse location = t.getWarehouse();

        // Devolver lo consumido. Se usa AJUSTE y no ENTRY para que el histórico
        // distinga una compra real de una reversión.
        for (InventoryTransformationLine line : t.linesOf(TransformationSide.CONSUMED)) {
            InventoryMovement m = InventoryMovement.create(
                    line.getProduct(), MovementType.POSITIVE_ADJUSTMENT,
                    line.getQuantity(), line.getUnitCost(),
                    null, null,
                    null, location,
                    "Anulación transformación " + t.getNumber() + ": " + reason, null, user);
            m.linkTo(MovementSourceType.INVENTORY_TRANSFORMATION_REVERSAL, t.getId());
            movementRepository.save(m);
        }

        // Retirar lo obtenido, aunque ya no haya existencias.
        for (InventoryTransformationLine line : t.obtainedProducts()) {
            InventoryMovement m = InventoryMovement.create(
                    line.getProduct(), MovementType.NEGATIVE_ADJUSTMENT,
                    line.getQuantity(), line.getResultingUnitCost(),
                    null, null,
                    location, null,
                    "Anulación transformación " + t.getNumber() + ": " + reason, null, user);
            m.linkTo(MovementSourceType.INVENTORY_TRANSFORMATION_REVERSAL, t.getId());
            movementRepository.save(m);
        }

        t.cancel(user, reason);
        log.info("Transformación {} anulada por {} · motivo: {}", t.getNumber(), user, reason);
        transformationRepository.save(t);
        return describe(t.getId());
    }

    /* ── Validación estructural ──────────────────────────────────────────── */

    private void validateStructure(InventoryTransformation t) {
        List<InventoryTransformationLine> consumed = t.linesOf(TransformationSide.CONSUMED);
        List<InventoryTransformationLine> obtainedAll = t.linesOf(TransformationSide.OBTAINED);

        if (consumed.isEmpty()) {
            throw new TransformationValidationException(
                    "Debe haber al menos un producto consumido (sale del inventario)");
        }
        if (t.obtainedProducts().isEmpty()) {
            throw new TransformationValidationException(
                    "Debe haber al menos un producto obtenido (entra al inventario). "
                            + "Una línea de merma sola no basta");
        }

        for (InventoryTransformationLine l : t.getLines()) {
            if (l.getQuantity() == null || l.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new TransformationValidationException(
                        "La cantidad de " + l.getProductName() + " debe ser mayor que cero");
            }
        }

        requireNoDuplicates(consumed, "consumidos");
        requireNoDuplicates(obtainedAll, "obtenidos");

        // Un producto no puede salir y ENTRAR en la misma operación: sería
        // imposible saber cuánto hay realmente de él al terminar.
        //
        // La merma queda fuera de esta regla a propósito. "3 kg de merma de
        // atún" ES atún, pero no entra al inventario: es lo que se perdió al
        // procesar. Prohibirlo obligaría a inventar un producto "merma de
        // atún" que nadie compra ni vende.
        Set<UUID> consumedIds = consumed.stream()
                .map(l -> l.getProduct().getId()).collect(java.util.stream.Collectors.toSet());
        for (InventoryTransformationLine l : obtainedAll) {
            if (l.getLineKind() == TransformationLineKind.WASTE) continue;
            if (consumedIds.contains(l.getProduct().getId())) {
                throw new TransformationValidationException(
                        l.getProductName() + " no puede estar consumido y obtenido a la vez");
            }
        }
    }

    private void requireNoDuplicates(List<InventoryTransformationLine> lines, String side) {
        Set<UUID> seen = new HashSet<>();
        for (InventoryTransformationLine l : lines) {
            if (!seen.add(l.getProduct().getId())) {
                throw new TransformationValidationException(
                        l.getProductName() + " aparece dos veces en los " + side
                                + ": consolida las cantidades en una sola línea");
            }
        }
    }

    /* ── Rendimiento ─────────────────────────────────────────────────────── */

    public record Yield(BigDecimal yieldPct, BigDecimal wastePct, boolean calculable) {}

    /**
     * Rendimiento = obtenido aprovechable / consumido, en unidad base.
     *
     * <p>Si alguna línea no es convertible a unidad base, devuelve null en vez
     * de un porcentaje: sumar kilos con unidades daría un número sin sentido
     * que alguien tomaría por bueno.
     */
    public Yield calculateYield(InventoryTransformation t) {
        BigDecimal consumedBase = sumBase(t.linesOf(TransformationSide.CONSUMED));
        BigDecimal obtainedBase = sumBase(t.obtainedProducts());

        if (consumedBase == null || obtainedBase == null
                || consumedBase.compareTo(BigDecimal.ZERO) <= 0) {
            return new Yield(null, null, false);
        }

        BigDecimal yieldPct = obtainedBase
                .multiply(BigDecimal.valueOf(100))
                .divide(consumedBase, PCT_SCALE, RoundingMode.HALF_UP);

        return new Yield(yieldPct,
                BigDecimal.valueOf(100).subtract(yieldPct).setScale(PCT_SCALE, RoundingMode.HALF_UP),
                true);
    }

    /** @return null si alguna línea no se puede convertir. */
    private BigDecimal sumBase(List<InventoryTransformationLine> lines) {
        BigDecimal total = BigDecimal.ZERO;
        for (InventoryTransformationLine l : lines) {
            if (l.getBaseQuantity() == null) return null;
            total = total.add(l.getBaseQuantity());
        }
        return total;
    }

    /* ── Consultas ───────────────────────────────────────────────────────── */

    /** Texto que acompaña siempre al costo. Ver el comentario del reparto. */
    public static final String COST_METHOD_NOTICE =
            "El costo se distribuye proporcionalmente al valor de venta de los productos "
            + "obtenidos. Este método genera un margen porcentual uniforme por diseño y sirve "
            + "para valorar el inventario. No lo uses para decidir cuál producto deja mayor "
            + "rentabilidad: siempre daría empate.";

    @Transactional(readOnly = true)
    public List<TransformationResponse> list() {
        return transformationRepository
                .findAllByDeletedAtIsNullOrderByTransformationDateDescNumberDesc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TransformationResponse get(UUID id) {
        return toResponse(transformationRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new TransformationValidationException(
                        "Transformación no encontrada: " + id)));
    }

    /**
     * Movimientos generados por el documento, en orden.
     *
     * <p>Se mapean AQUÍ, dentro de la transacción. Con open-in-view apagado,
     * devolver entidades y mapearlas en el controlador revienta al tocar el
     * producto perezoso.
     */
    @Transactional(readOnly = true)
    public List<MovementResponse> movementsOf(UUID transformationId) {
        return movementRepository.findAll().stream()
                .filter(m -> transformationId.equals(m.getSourceId()))
                .sorted(Comparator.comparing(InventoryMovement::getCreatedAt))
                .map(MovementResponse::of)
                .toList();
    }

    /** Relee el documento con su grafo completo y lo mapea. */
    private TransformationResponse describe(UUID id) {
        return toResponse(transformationRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new TransformationValidationException(
                        "Transformación no encontrada tras guardar: " + id)));
    }

    public TransformationResponse toResponse(InventoryTransformation t) {
        Yield yield = calculateYield(t);
        return new TransformationResponse(
                t.getId(), t.getNumber(), t.getTransformationDate(), t.getStatus().name(),
                t.getWarehouse() != null ? t.getWarehouse().getId() : null,
                t.getWarehouse() != null ? t.getWarehouse().getName() : null,
                t.getNotes(), t.getCreatedBy(), t.getCreatedAt(),
                t.getConfirmedBy(), t.getConfirmedAt(),
                t.getCancelledBy(), t.getCancelledAt(), t.getCancelReason(),
                t.getInputTotalCost(), t.getCostingStatus().name(),
                t.getYieldPercentage(), t.getWastePercentage(), yield.calculable(),
                t.linesOf(TransformationSide.CONSUMED).stream().map(LineResponse::of).toList(),
                t.linesOf(TransformationSide.OBTAINED).stream().map(LineResponse::of).toList(),
                warningsFor(t, yield),
                COST_METHOD_NOTICE);
    }

    /**
     * Advertencias que informan pero NO impiden confirmar.
     *
     * <p>Se calculan al vuelo sobre el stock de HOY: sirven para decidir antes
     * de confirmar, no para describir lo que ya pasó.
     */
    public List<WarningResponse> warningsFor(InventoryTransformation t, Yield yield) {
        List<WarningResponse> warnings = new ArrayList<>();

        if (t.getStatus() == TransformationStatus.DRAFT) {
            for (InventoryTransformationLine l : t.linesOf(TransformationSide.CONSUMED)) {
                BigDecimal actual = movementRepository.calculateCurrentStock(l.getProduct().getId());
                BigDecimal resultante = actual.subtract(l.getQuantity());
                if (resultante.compareTo(BigDecimal.ZERO) < 0) {
                    warnings.add(new WarningResponse("NEGATIVE_STOCK",
                            "Esta transformación dejará " + l.getProductName()
                                    + " con una existencia de " + resultante.stripTrailingZeros().toPlainString()
                                    + " " + l.getUnit().name().toLowerCase() + "."));
                }
            }
        }

        if (yield.calculable() && yield.yieldPct() != null
                && yield.yieldPct().compareTo(BigDecimal.valueOf(100)) > 0) {
            warnings.add(new WarningResponse("YIELD_ABOVE_100",
                    "El rendimiento calculado es " + yield.yieldPct().stripTrailingZeros().toPlainString()
                            + "%. Verifica si existen materias primas adicionales no registradas. "
                            + "Puedes continuar."));
        }

        if (!yield.calculable() && !t.getLines().isEmpty()) {
            warnings.add(new WarningResponse("YIELD_NOT_CALCULABLE",
                    "El rendimiento no se puede calcular: hay unidades que no son convertibles "
                            + "entre sí. Declara el factor de unidad base en esos productos."));
        }

        if (t.getCostingStatus() == CostingStatus.UNCOSTED) {
            warnings.add(new WarningResponse("UNCOSTED",
                    "Sin costear: algún producto consumido no tenía costo conocido. "
                            + "No se asignó costo cero a propósito, porque daría un margen falso."));
        }

        return warnings;
    }

    /* ── Utilidades ──────────────────────────────────────────────────────── */

    private InventoryTransformation requireEditable(UUID id) {
        InventoryTransformation t = transformationRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new TransformationValidationException(
                        "Transformación no encontrada: " + id));
        if (!t.isEditable()) {
            throw new TransformationValidationException(
                    "La transformación " + t.getNumber() + " no se puede editar (estado: "
                            + t.getStatus() + "). Anúlala y crea una nueva");
        }
        return t;
    }

    private String nextNumber() {
        return String.format("TR-%06d", transformationRepository.nextNumberValue());
    }
}
