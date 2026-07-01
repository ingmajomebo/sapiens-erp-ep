package com.sapiens.erp.modules.procurement.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineRequest(
        @NotNull UUID productId,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        @NotNull @DecimalMin("0.00") BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal discount
) {}
