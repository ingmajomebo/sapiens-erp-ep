package com.sapiens.erp.modules.procurement.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_lines")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseOrderLine extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    public static PurchaseOrderLine create(Product product, BigDecimal quantity,
                                            BigDecimal unitCost, BigDecimal taxRate, BigDecimal discount) {
        PurchaseOrderLine line = new PurchaseOrderLine();
        line.id = UUID.randomUUID();
        line.product = product;
        line.quantity = quantity;
        line.unitCost = unitCost;
        line.taxRate = taxRate;
        line.discount = discount != null ? discount : BigDecimal.ZERO;
        return line;
    }

    /** Discounted net = qty * unitCost * (1 - discount%) */
    public BigDecimal discountedNet() {
        BigDecimal net = quantity.multiply(unitCost);
        if (discount.compareTo(BigDecimal.ZERO) == 0) return net;
        return net.multiply(BigDecimal.ONE.subtract(
                discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)));
    }

    /** lineTotal = discountedNet * (1 + taxRate%) */
    public BigDecimal lineTotal() {
        BigDecimal net = discountedNet();
        BigDecimal tax = net.multiply(taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return net.add(tax);
    }
}
