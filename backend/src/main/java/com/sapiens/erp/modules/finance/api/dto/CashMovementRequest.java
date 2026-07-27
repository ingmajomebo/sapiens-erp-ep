package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.CashMovementDirection;
import com.sapiens.erp.modules.finance.domain.CashPaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CashMovementRequest(
        @NotNull CashMovementDirection direction,
        @NotNull @DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0") BigDecimal amount,
        @NotNull CashPaymentMethod paymentMethod,
        @NotBlank String description
) {}
