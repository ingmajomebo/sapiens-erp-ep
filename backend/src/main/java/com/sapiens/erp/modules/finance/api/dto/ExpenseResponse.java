package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.Expense;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseResponse(
        UUID id,
        String category,
        BigDecimal amount,
        LocalDate expenseDate,
        String description,
        String status,
        UUID financialAccountId,
        String financialAccountName,
        Instant createdAt,
        Instant updatedAt
) {
    public static ExpenseResponse from(Expense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getCategory().name(),
                e.getAmount(),
                e.getExpenseDate(),
                e.getDescription(),
                e.getStatus().name(),
                e.getFinancialAccount().getId(),
                e.getFinancialAccount().getName(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
