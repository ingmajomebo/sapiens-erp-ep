package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
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

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static InventoryMovement create(Product product, MovementType type, BigDecimal quantity,
                                           BigDecimal unitCost, String reason, String notes, String createdBy) {
        return create(product, type, quantity, unitCost, null, null, reason, notes, createdBy);
    }

    public static InventoryMovement create(Product product, MovementType type, BigDecimal quantity,
                                           BigDecimal unitCost, BigDecimal previousAverageCost, BigDecimal newAverageCost,
                                           String reason, String notes, String createdBy) {
        InventoryMovement m = new InventoryMovement();
        m.id = UUID.randomUUID();
        m.product = product;
        m.movementType = type;
        m.quantity = quantity;
        m.unitCost = unitCost;
        m.previousAverageCost = previousAverageCost;
        m.newAverageCost = newAverageCost;
        m.reason = reason;
        m.notes = notes;
        m.createdBy = createdBy;
        m.createdAt = Instant.now();
        return m;
    }
}
