package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.Warehouse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "lots")
@Getter
@NoArgsConstructor
public class Lot {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(precision = 10, scale = 3, nullable = false)
    private BigDecimal quantity;

    @Column(name = "purchase_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal purchasePrice;

    @Column(name = "received_at", nullable = false)
    private LocalDate receivedAt;

    @Column(name = "expires_at")
    private LocalDate expiresAt;

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static Lot create(Product product, BigDecimal quantity, BigDecimal purchasePrice,
                             LocalDate receivedAt, LocalDate expiresAt, String invoiceNumber,
                             String notes, Warehouse warehouse) {
        Lot lot = new Lot();
        lot.id = UUID.randomUUID();
        lot.product = product;
        lot.quantity = quantity;
        lot.purchasePrice = purchasePrice;
        lot.receivedAt = receivedAt != null ? receivedAt : LocalDate.now();
        lot.expiresAt = expiresAt;
        lot.invoiceNumber = invoiceNumber;
        lot.notes = notes;
        lot.warehouse = warehouse;
        lot.createdAt = Instant.now();
        return lot;
    }
}
