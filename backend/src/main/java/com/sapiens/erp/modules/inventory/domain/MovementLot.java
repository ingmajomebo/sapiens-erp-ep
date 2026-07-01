package com.sapiens.erp.modules.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/** Tracks which lots were consumed by an EXIT/WASTE movement (FIFO). */
@Entity
@Table(name = "movement_lots")
@Getter
@NoArgsConstructor
public class MovementLot {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movement_id", nullable = false)
    private InventoryMovement movement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    @Column(precision = 10, scale = 3, nullable = false)
    private BigDecimal quantity;

    public static MovementLot create(InventoryMovement movement, Lot lot, BigDecimal quantity) {
        MovementLot ml = new MovementLot();
        ml.id = UUID.randomUUID();
        ml.movement = movement;
        ml.lot = lot;
        ml.quantity = quantity;
        return ml;
    }
}
