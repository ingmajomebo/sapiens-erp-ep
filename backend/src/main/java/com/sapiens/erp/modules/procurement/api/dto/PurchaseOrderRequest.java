package com.sapiens.erp.modules.procurement.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderRequest(
        @NotNull UUID supplierId,
        LocalDate expectedDelivery,
        String warehouse,
        String paymentTerms,
        String notes,
        @NotEmpty @Valid List<PurchaseOrderLineRequest> lines
) {}
