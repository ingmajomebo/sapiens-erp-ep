package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseRequest(
        @NotNull ExpenseCategory category,
        @NotNull @DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0") BigDecimal amount,
        @NotNull LocalDate expenseDate,
        @NotBlank String description,
        @NotNull UUID financialAccountId
) {}
