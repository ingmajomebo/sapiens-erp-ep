package com.sapiens.erp.modules.procurement.api.dto;

import com.sapiens.erp.modules.procurement.domain.PurchaseReceipt;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseReceiptResponse(
        UUID id,
        UUID purchaseOrderId,
        String orderNumber,
        String notes,
        List<PurchaseReceiptLineResponse> lines,
        BigDecimal totalReceived,
        Instant createdAt
) {
    public static PurchaseReceiptResponse from(PurchaseReceipt r) {
        return new PurchaseReceiptResponse(
                r.getId(),
                r.getPurchaseOrder().getId(),
                r.getPurchaseOrder().getOrderNumber(),
                r.getNotes(),
                r.getLines().stream().map(PurchaseReceiptLineResponse::from).toList(),
                r.totalReceived(),
                r.getCreatedAt()
        );
    }
}
