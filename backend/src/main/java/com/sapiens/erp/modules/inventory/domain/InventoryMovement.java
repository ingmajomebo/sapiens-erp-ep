package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.Warehouse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable record of every stock change. Never UPDATE or DELETE.
 */
@Entity
@Table(name = "inventory_movements")
@Getter
@NoArgsConstructor
public class InventoryMovement {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", length = 30, nullable = false)
    private MovementType movementType;

    @Column(precision = 10, scale = 3, nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "previous_average_cost", precision = 14, scale = 4)
    private BigDecimal previousAverageCost;

    @Column(name = "new_average_cost", precision = 14, scale = 4)
    private BigDecimal newAverageCost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_location_id")
    private Warehouse fromLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_location_id")
    private Warehouse toLocation;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    /**
     * Documento que originó el movimiento. Null en los movimientos sueltos y
     * en todo el histórico anterior a que existiera este vínculo.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 40)
    private MovementSourceType sourceType;

    @Column(name = "source_id")
    private UUID sourceId;

    /** Ata el movimiento a su documento. Se llama antes de persistir. */
    public void linkTo(MovementSourceType type, UUID documentId) {
        this.sourceType = type;
        this.sourceId = documentId;
    }

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // ── Factory methods ────────────────────────────────────────────────────────

    /** Without location context (backward-compatible). */
    public static InventoryMovement create(Product product, MovementType type, BigDecimal quantity,
                                           BigDecimal unitCost, String reason, String notes, String createdBy) {
        return create(product, type, quantity, unitCost, null, null, null, null, reason, notes, createdBy);
    }

    /** Without location context, with cost recalculation data. */
    public static InventoryMovement create(Product product, MovementType type, BigDecimal quantity,
                                           BigDecimal unitCost, BigDecimal previousAverageCost, BigDecimal newAverageCost,
                                           String reason, String notes, String createdBy) {
        return create(product, type, quantity, unitCost, previousAverageCost, newAverageCost, null, null, reason, notes, createdBy);
    }

    /** Full create with locations and cost data. */
    public static InventoryMovement create(Product product, MovementType type, BigDecimal quantity,
                                           BigDecimal unitCost, BigDecimal previousAverageCost, BigDecimal newAverageCost,
                                           Warehouse fromLocation, Warehouse toLocation,
                                           String reason, String notes, String createdBy) {
        InventoryMovement m = new InventoryMovement();
        m.id = UUID.randomUUID();
        m.product = product;
        m.movementType = type;
        m.quantity = quantity;
        m.unitCost = unitCost;
        m.previousAverageCost = previousAverageCost;
        m.newAverageCost = newAverageCost;
        m.fromLocation = fromLocation;
        m.toLocation = toLocation;
        m.reason = reason;
        m.notes = notes;
        m.createdBy = createdBy;
        m.createdAt = Instant.now();
        return m;
    }

    /** Convenience factory for TRANSFER movements. */
    public static InventoryMovement createTransfer(Product product, BigDecimal quantity,
                                                   Warehouse fromLocation, Warehouse toLocation,
                                                   String reason, String notes, String createdBy) {
        return create(product, MovementType.TRANSFER, quantity, null, null, null,
                fromLocation, toLocation, reason, notes, createdBy);
    }
}
