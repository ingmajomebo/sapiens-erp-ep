package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.CashSession;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashSessionResponse(
        UUID id,
        String sessionNumber,
        String openedByName,
        String closedByName,
        Instant openedAt,
        Instant closedAt,
        BigDecimal openingBalance,
        BigDecimal expectedBalance,
        BigDecimal countedBalance,
        BigDecimal variance,
        String status,
        String notes
) {
    public static CashSessionResponse from(CashSession s) {
        return new CashSessionResponse(
                s.getId(),
                s.getSessionNumber(),
                s.getOpenedBy() != null ? s.getOpenedBy().getName() : null,
                s.getClosedBy() != null ? s.getClosedBy().getName() : null,
                s.getOpenedAt(),
                s.getClosedAt(),
                s.getOpeningBalance(),
                s.getExpectedBalance(),
                s.getCountedBalance(),
                s.getVariance(),
                s.getStatus().name(),
                s.getNotes()
        );
    }
}
