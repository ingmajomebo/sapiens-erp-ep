package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.SupplierPayment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SupplierPaymentResponse(
        UUID id,
        LocalDate paymentDate,
        BigDecimal amount,
        String paymentMethod,
        String paymentOrigin,
        String supplierAccount,
        String referenceNumber,
        String notes,
        Instant createdAt
) {
    public static SupplierPaymentResponse from(SupplierPayment p) {
        return new SupplierPaymentResponse(
                p.getId(),
                p.getPaymentDate(),
                p.getAmount(),
                p.getPaymentMethod(),
                p.getPaymentOrigin(),
                p.getSupplierAccount(),
                p.getReferenceNumber(),
                p.getNotes(),
                p.getCreatedAt()
        );
    }
}
