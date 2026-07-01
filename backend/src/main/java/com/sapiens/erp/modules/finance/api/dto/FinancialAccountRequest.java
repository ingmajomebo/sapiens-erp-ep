package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.FinancialAccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record FinancialAccountRequest(
        @NotBlank String name,
        @NotNull FinancialAccountType accountType,
        BigDecimal initialBalance,
        String notes
) {}
