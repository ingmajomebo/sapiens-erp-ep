package com.sapiens.erp.modules.finance.api.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CloseRegisterRequest(
        @NotNull BigDecimal countedBalance,
        String notes
) {}
