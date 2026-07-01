package com.sapiens.erp.modules.inventory.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EntryRequest(
        @NotNull UUID productId,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        @NotNull @DecimalMin("0.00") BigDecimal purchasePrice,
        LocalDate receivedAt,
        LocalDate expiresAt,
        String invoiceNumber,
        String notes,
        String createdBy
) {}
