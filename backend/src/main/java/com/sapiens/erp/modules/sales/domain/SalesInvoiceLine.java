package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/** Línea de factura: snapshot con descuento e IVA por línea (tarifas 0/5/19). */
@Entity
@Table(name = "sales_invoice_lines")
@Getter
@Setter
@NoArgsConstructor
public class SalesInvoiceLine extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 14, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPct = BigDecimal.ZERO;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 4)
    private BigDecimal lineTotal;

    public static SalesInvoiceLine create(Product product, String description, BigDecimal quantity,
                                          BigDecimal unitPrice, BigDecimal discountPct, BigDecimal taxRate) {
        SalesInvoiceLine l = new SalesInvoiceLine();
        l.id = UUID.randomUUID();
        l.product = product;
        l.description = description;
        l.quantity = quantity;
        l.unitPrice = unitPrice;
        l.discountPct = discountPct != null ? discountPct : BigDecimal.ZERO;
        l.taxRate = taxRate != null ? taxRate : BigDecimal.ZERO;
        l.lineTotal = l.computeTotal();
        return l;
    }

    /** Bruto de la línea antes de descuento e impuestos. */
    public BigDecimal gross() {
        return unitPrice.multiply(quantity);
    }

    public BigDecimal discountAmount() {
        return gross().multiply(discountPct).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
    }

    /** Base gravable: bruto − descuento. */
    public BigDecimal taxableBase() {
        return gross().subtract(discountAmount());
    }

    public BigDecimal taxAmount() {
        return taxableBase().multiply(taxRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
    }

    /** Total de la línea: base + IVA. */
    public BigDecimal computeTotal() {
        return taxableBase().add(taxAmount());
    }
}
