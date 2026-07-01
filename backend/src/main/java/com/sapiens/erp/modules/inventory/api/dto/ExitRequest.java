package com.sapiens.erp.modules.inventory.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ExitRequest(
        @NotNull UUID productId,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        String reason,
        String notes,
        String createdBy
) {}
