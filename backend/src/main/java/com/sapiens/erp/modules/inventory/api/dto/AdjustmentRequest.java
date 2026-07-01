package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.inventory.domain.MovementType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record AdjustmentRequest(
        @NotNull UUID productId,
        @NotNull MovementType type,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        BigDecimal unitCost,
        @NotBlank String reason,
        String notes,
        String createdBy
) {}
