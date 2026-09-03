package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.Warehouse;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Documento que agrupa una transformación completa: lo que se consumió, lo que
 * se obtuvo y la merma, en una sola operación.
 * <p>
 * Existe como documento y no como movimientos sueltos porque una
 * transformación a medias es peor que ninguna: dejaría el inventario
 * mostrando a la vez la materia prima y el producto terminado, duplicando
 * mercancía que no existe.
 */
@Entity
@Table(name = "inventory_transformations")
@Getter
@Setter
@NoArgsConstructor
public class InventoryTransformation extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 20)
    private String number;

    @Column(name = "transformation_date", nullable = false)
    private LocalDate transformationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransformationStatus status = TransformationStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "confirmed_by", length = 100)
    private String confirmedBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    /** Congelado al confirmar. Nunca se recalcula con datos de hoy. */
    @Column(name = "input_total_cost", precision = 16, scale = 4)
    private BigDecimal inputTotalCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "costing_status", nullable = false, length = 20)
    private CostingStatus costingStatus = CostingStatus.PENDING;

    @Column(name = "yield_percentage", precision = 9, scale = 4)
    private BigDecimal yieldPercentage;

    @Column(name = "waste_percentage", precision = 9, scale = 4)
    private BigDecimal wastePercentage;

    @OneToMany(mappedBy = "transformation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("side ASC, displayOrder ASC")
    private List<InventoryTransformationLine> lines = new ArrayList<>();

    /* ── Fábrica ─────────────────────────────────────────────────────────── */

    public static InventoryTransformation draft(String number, LocalDate date,
                                                Warehouse warehouse, String notes,
                                                String createdBy) {
        InventoryTransformation t = new InventoryTransformation();
        t.id = UUID.randomUUID();
        t.number = number;
        t.transformationDate = date;
        t.warehouse = warehouse;
        t.notes = notes;
        t.createdBy = createdBy;
        t.status = TransformationStatus.DRAFT;
        t.costingStatus = CostingStatus.PENDING;
        return t;
    }

    /* ── Transiciones ────────────────────────────────────────────────────── */

    /**
     * Marca el documento como confirmado. La comprobación de estado vive aquí
     * y no solo en el servicio: confirmar dos veces duplicaría el inventario.
     */
    public void confirm(String user, BigDecimal inputTotalCost, CostingStatus costing,
                        BigDecimal yieldPct, BigDecimal wastePct) {
        if (status != TransformationStatus.DRAFT) {
            throw new IllegalStateException(
                    "Solo un borrador se puede confirmar (estado actual: " + status + ")");
        }
        this.status = TransformationStatus.CONFIRMED;
        this.confirmedBy = user;
        this.confirmedAt = Instant.now();
        this.inputTotalCost = inputTotalCost;
        this.costingStatus = costing;
        this.yieldPercentage = yieldPct;
        this.wastePercentage = wastePct;
    }

    /** Anular no borra: conserva todo el contenido y añade el rastro. */
    public void cancel(String user, String reason) {
        if (status == TransformationStatus.CANCELLED) {
            throw new IllegalStateException("La transformación " + number + " ya está anulada");
        }
        if (status != TransformationStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Solo una transformación confirmada se puede anular (estado actual: " + status + ")");
        }
        this.status = TransformationStatus.CANCELLED;
        this.cancelledBy = user;
        this.cancelledAt = Instant.now();
        this.cancelReason = reason;
    }

    public boolean isEditable() {
        return status == TransformationStatus.DRAFT;
    }

    public void addLine(InventoryTransformationLine line) {
        line.setTransformation(this);
        this.lines.add(line);
    }

    public List<InventoryTransformationLine> linesOf(TransformationSide side) {
        return lines.stream().filter(l -> l.getSide() == side).toList();
    }

    /** Lo obtenido que sí entra al inventario: la merma no cuenta. */
    public List<InventoryTransformationLine> obtainedProducts() {
        return lines.stream()
                .filter(l -> l.getSide() == TransformationSide.OBTAINED)
                .filter(l -> l.getLineKind() == TransformationLineKind.PRODUCT)
                .toList();
    }

    public List<InventoryTransformationLine> wasteLines() {
        return lines.stream()
                .filter(l -> l.getLineKind() == TransformationLineKind.WASTE)
                .toList();
    }
}
