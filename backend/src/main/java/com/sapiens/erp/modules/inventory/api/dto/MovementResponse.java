package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.inventory.domain.InventoryMovement;
import com.sapiens.erp.modules.inventory.domain.MovementType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record MovementResponse(
        UUID id,
        UUID productId,
        String productName,
        MovementType movementType,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal previousAverageCost,
        BigDecimal newAverageCost,
        String reason,
        String notes,
        String createdBy,
        Instant createdAt
) {
    public static MovementResponse of(InventoryMovement m) {
        return new MovementResponse(
                m.getId(),
                m.getProduct().getId(),
                m.getProduct().getName(),
                m.getMovementType(),
                m.getQuantity(),
                m.getUnitCost(),
                m.getPreviousAverageCost(),
                m.getNewAverageCost(),
                m.getReason(),
                m.getNotes(),
                m.getCreatedBy(),
                m.getCreatedAt()
        );
    }
}
