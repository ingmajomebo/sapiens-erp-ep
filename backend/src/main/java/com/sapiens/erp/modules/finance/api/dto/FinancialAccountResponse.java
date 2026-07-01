package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.FinancialAccount;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FinancialAccountResponse(
        UUID id,
        String name,
        String accountType,
        BigDecimal initialBalance,
        BigDecimal currentBalance,
        String status,
        String notes,
        Instant createdAt
) {
    public static FinancialAccountResponse from(FinancialAccount a) {
        return new FinancialAccountResponse(
                a.getId(),
                a.getName(),
                a.getAccountType().name(),
                a.getInitialBalance(),
                a.getCurrentBalance(),
                a.getStatus().name(),
                a.getNotes(),
                a.getCreatedAt()
        );
    }
}
