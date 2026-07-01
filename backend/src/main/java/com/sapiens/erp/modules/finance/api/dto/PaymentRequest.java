package com.sapiens.erp.modules.finance.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRequest(
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        LocalDate paymentDate,
        String paymentMethod,
        String paymentOrigin,
        String supplierAccount,
        String referenceNumber,
        String notes,
        java.util.UUID financialAccountId
) {}
