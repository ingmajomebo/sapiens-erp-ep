package com.sapiens.erp.modules.procurement.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ReceiveLineRequest(
        @NotNull UUID lineId,
        @NotNull @DecimalMin("0") BigDecimal quantityReceived
) {}
