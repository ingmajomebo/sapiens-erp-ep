package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.inventory.domain.Lot;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LotResponse(
        UUID id,
        UUID productId,
        String productName,
        BigDecimal originalQuantity,
        BigDecimal availableQuantity,
        BigDecimal purchasePrice,
        LocalDate receivedAt,
        LocalDate expiresAt,
        String invoiceNumber,
        String notes,
        Instant createdAt
) {
    public static LotResponse of(Lot lot, BigDecimal available) {
        return new LotResponse(
                lot.getId(),
                lot.getProduct().getId(),
                lot.getProduct().getName(),
                lot.getQuantity(),
                available,
                lot.getPurchasePrice(),
                lot.getReceivedAt(),
                lot.getExpiresAt(),
                lot.getInvoiceNumber(),
                lot.getNotes(),
                lot.getCreatedAt()
        );
    }
}
