package com.sapiens.erp.modules.inventory.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
        @NotNull UUID productId,
        UUID lotId,              // optional; if null, FIFO is used
        @NotNull UUID fromLocationId,
        @NotNull UUID toLocationId,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        String reason,
        String notes,
        String createdBy
) {}
