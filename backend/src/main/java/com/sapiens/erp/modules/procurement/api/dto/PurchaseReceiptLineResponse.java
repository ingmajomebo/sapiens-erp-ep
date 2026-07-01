package com.sapiens.erp.modules.procurement.api.dto;

import com.sapiens.erp.modules.procurement.domain.PurchaseReceiptLine;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseReceiptLineResponse(
        UUID id,
        UUID productId,
        String productName,
        String unitOfMeasure,
        BigDecimal quantityOrdered,
        BigDecimal quantityReceived,
        BigDecimal quantityPending,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal discount,
        BigDecimal lineTotal
) {
    public static PurchaseReceiptLineResponse from(PurchaseReceiptLine l) {
        return new PurchaseReceiptLineResponse(
                l.getId(),
                l.getProduct().getId(),
                l.getProduct().getName(),
                l.getProduct().getUnitOfMeasure().name(),
                l.getQuantityOrdered(),
                l.getQuantityReceived(),
                l.getQuantityOrdered().subtract(l.getQuantityReceived()),
                l.getUnitCost(),
                l.getTaxRate(),
                l.getDiscount(),
                l.lineTotal()
        );
    }
}
