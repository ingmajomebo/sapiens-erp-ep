package com.sapiens.erp.modules.procurement.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_receipt_lines")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseReceiptLine {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receipt_id", nullable = false)
    private PurchaseReceipt receipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_line_id", nullable = false)
    private PurchaseOrderLine purchaseOrderLine;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity_ordered", nullable = false, precision = 14, scale = 4)
    private BigDecimal quantityOrdered;

    @Column(name = "quantity_received", nullable = false, precision = 14, scale = 4)
    private BigDecimal quantityReceived;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static PurchaseReceiptLine createFrom(PurchaseOrderLine poLine, BigDecimal receivedQty) {
        PurchaseReceiptLine rl = new PurchaseReceiptLine();
        rl.id = UUID.randomUUID();
        rl.purchaseOrderLine = poLine;
        rl.product = poLine.getProduct();
        rl.quantityOrdered = poLine.getQuantity();
        rl.quantityReceived = receivedQty;
        rl.unitCost = poLine.getUnitCost();
        rl.taxRate = poLine.getTaxRate();
        rl.discount = poLine.getDiscount();
        rl.createdAt = Instant.now();
        rl.updatedAt = Instant.now();
        return rl;
    }

    private BigDecimal discountedNet() {
        BigDecimal net = quantityReceived.multiply(unitCost);
        if (discount.compareTo(BigDecimal.ZERO) == 0) return net;
        return net.multiply(BigDecimal.ONE.subtract(
                discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)));
    }

    public BigDecimal lineTotal() {
        BigDecimal net = discountedNet();
        BigDecimal tax = net.multiply(taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return net.add(tax);
    }
}
