package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Pago (total o parcial) registrado sobre una factura. */
@Entity
@Table(name = "sales_invoice_payments")
@Getter
@Setter
@NoArgsConstructor
public class SalesInvoicePayment extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 15)
    private InvoicePaymentMethod paymentMethod;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(length = 100)
    private String reference;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static SalesInvoicePayment create(SalesInvoice invoice, BigDecimal amount,
                                             InvoicePaymentMethod method, LocalDate paidOn,
                                             String reference, String notes) {
        SalesInvoicePayment p = new SalesInvoicePayment();
        p.id = UUID.randomUUID();
        p.invoice = invoice;
        p.amount = amount;
        p.paymentMethod = method;
        p.paidOn = paidOn != null ? paidOn : LocalDate.now();
        p.reference = reference;
        p.notes = notes;
        return p;
    }
}
