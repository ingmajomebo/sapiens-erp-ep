package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.AccountsPayable;
import com.sapiens.erp.modules.finance.domain.AccountsPayableStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AccountsPayableResponse(
        UUID id,
        UUID purchaseOrderId,
        String orderNumber,
        UUID supplierId,
        String supplierName,
        String invoiceNumber,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal pendingAmount,
        AccountsPayableStatus status,
        LocalDate dueDate,
        String notes,
        Instant createdAt
) {
    public static AccountsPayableResponse from(AccountsPayable ap) {
        return new AccountsPayableResponse(
                ap.getId(),
                ap.getPurchaseOrder().getId(),
                ap.getPurchaseOrder().getOrderNumber(),
                ap.getSupplier().getId(),
                ap.getSupplier().getName(),
                ap.getInvoiceNumber(),
                ap.getTotalAmount(),
                ap.getPaidAmount(),
                ap.pendingAmount(),
                ap.getStatus(),
                ap.getDueDate(),
                ap.getNotes(),
                ap.getCreatedAt()
        );
    }
}
