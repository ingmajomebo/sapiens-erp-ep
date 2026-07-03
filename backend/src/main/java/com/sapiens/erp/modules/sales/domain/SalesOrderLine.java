package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "sales_order_lines")
@Getter
@Setter
@NoArgsConstructor
public class SalesOrderLine extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Snapshot del nombre al momento del pedido (el catálogo puede cambiar después). */
    @Column(name = "product_name", length = 100, nullable = false)
    private String productName;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;

    /** Snapshot del precio de venta al momento del pedido. */
    @Column(name = "unit_price", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitPrice;

    public static SalesOrderLine create(Product product, BigDecimal quantity) {
        SalesOrderLine l = new SalesOrderLine();
        l.id = UUID.randomUUID();
        l.product = product;
        l.productName = product.getName();
        l.quantity = quantity;
        l.unitPrice = product.getSalePrice() != null ? product.getSalePrice() : BigDecimal.ZERO;
        return l;
    }

    public BigDecimal lineTotal() {
        return unitPrice.multiply(quantity);
    }
}
