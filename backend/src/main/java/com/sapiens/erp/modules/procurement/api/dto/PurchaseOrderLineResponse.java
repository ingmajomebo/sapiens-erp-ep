package com.sapiens.erp.modules.procurement.api.dto;

import com.sapiens.erp.modules.procurement.domain.PurchaseOrderLine;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseOrderLineResponse(
        UUID id,
        UUID productId,
        String productName,
        String unitOfMeasure,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal discount,
        BigDecimal lineTotal
) {
    public static PurchaseOrderLineResponse from(PurchaseOrderLine l) {
        return new PurchaseOrderLineResponse(
                l.getId(),
                l.getProduct().getId(),
                l.getProduct().getName(),
                l.getProduct().getUnitOfMeasure().name(),
                l.getQuantity(),
                l.getUnitCost(),
                l.getTaxRate(),
                l.getDiscount(),
                l.lineTotal()
        );
    }
}
