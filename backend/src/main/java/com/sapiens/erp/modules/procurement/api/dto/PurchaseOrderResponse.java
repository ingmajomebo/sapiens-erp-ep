package com.sapiens.erp.modules.procurement.api.dto;

import com.sapiens.erp.modules.procurement.domain.PurchaseOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
        UUID id,
        String orderNumber,
        UUID supplierId,
        String supplierName,
        String status,
        LocalDate expectedDelivery,
        String warehouse,
        UUID warehouseId,
        String warehouseName,
        String paymentTerms,
        String notes,
        BigDecimal discount,
        BigDecimal paidAmount,
        BigDecimal subtotal,
        BigDecimal totalTax,
        BigDecimal total,
        BigDecimal pendingBalance,
        List<PurchaseOrderLineResponse> lines,
        Instant createdAt,
        Instant updatedAt
) {
    public static PurchaseOrderResponse from(PurchaseOrder po) {
        return new PurchaseOrderResponse(
                po.getId(),
                po.getOrderNumber(),
                po.getSupplier().getId(),
                po.getSupplier().getName(),
                po.getStatus().name(),
                po.getExpectedDelivery(),
                po.getWarehouse(),
                po.getWarehouseRef() != null ? po.getWarehouseRef().getId() : null,
                po.getWarehouseRef() != null ? po.getWarehouseRef().getName() : po.getWarehouse(),
                po.getPaymentTerms(),
                po.getNotes(),
                po.getDiscount(),
                po.getPaidAmount(),
                po.subtotal(),
                po.totalTax(),
                po.total(),
                po.pendingBalance(),
                po.getLines().stream().map(PurchaseOrderLineResponse::from).toList(),
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }
}
