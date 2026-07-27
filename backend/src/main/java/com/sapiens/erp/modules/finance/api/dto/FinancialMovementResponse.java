package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.FinancialMovement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record FinancialMovementResponse(
        UUID id,
        String movementType,
        String concept,
        BigDecimal amount,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter,
        String relatedDocument,
        LocalDate movementDate,
        Instant createdAt,
        String accountName
) {
    public static FinancialMovementResponse from(FinancialMovement m) {
        return new FinancialMovementResponse(
                m.getId(),
                m.getMovementType().name(),
                m.getConcept(),
                m.getAmount(),
                m.getBalanceBefore(),
                m.getBalanceAfter(),
                m.getRelatedDocument(),
                m.getMovementDate(),
                m.getCreatedAt(),
                m.getFinancialAccount() != null ? m.getFinancialAccount().getName() : null
        );
    }
}
