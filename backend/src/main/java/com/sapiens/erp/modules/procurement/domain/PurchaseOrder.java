package com.sapiens.erp.modules.procurement.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "purchase_orders")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseOrder extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "order_number", length = 20, nullable = false, unique = true)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private PurchaseOrderStatus status;

    @Column(name = "expected_delivery")
    private LocalDate expectedDelivery;

    @Column(length = 100)
    private String warehouse;

    @Column(name = "payment_terms", length = 50)
    private String paymentTerms;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderLine> lines = new ArrayList<>();

    public static PurchaseOrder create(String orderNumber, Supplier supplier, LocalDate expectedDelivery,
                                        String warehouse, String paymentTerms, String notes) {
        PurchaseOrder po = new PurchaseOrder();
        po.id = UUID.randomUUID();
        po.orderNumber = orderNumber;
        po.supplier = supplier;
        po.status = PurchaseOrderStatus.DRAFT;
        po.expectedDelivery = expectedDelivery;
        po.warehouse = warehouse;
        po.paymentTerms = paymentTerms;
        po.notes = notes;
        return po;
    }

    public void addLine(PurchaseOrderLine line) {
        line.setPurchaseOrder(this);
        lines.add(line);
    }

    public BigDecimal subtotal() {
        return lines.stream()
                .map(PurchaseOrderLine::discountedNet)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal totalTax() {
        return lines.stream()
                .map(l -> l.discountedNet()
                        .multiply(l.getTaxRate())
                        .divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal total() {
        return subtotal().add(totalTax()).subtract(discount);
    }

    public BigDecimal pendingBalance() {
        return total().subtract(paidAmount);
    }
}
