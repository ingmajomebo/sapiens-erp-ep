package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.CashSessionMovement;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashMovementResponse(
        UUID id,
        String movementType,
        String direction,
        String paymentMethod,
        BigDecimal amount,
        String reference,
        String description,
        Instant createdAt
) {
    public static CashMovementResponse from(CashSessionMovement m) {
        return new CashMovementResponse(
                m.getId(),
                m.getMovementType().name(),
                m.getDirection().name(),
                m.getPaymentMethod().name(),
                m.getAmount(),
                m.getReference(),
                m.getDescription(),
                m.getCreatedAt()
        );
    }
}
