package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Factura de venta. Nace como BORRADOR desde el pedido, se emite (fija emisión y
 * vencimiento según forma de pago) y se paga total o parcialmente.
 * VENCIDA es derivado (isOverdue), no un estado persistido.
 */
@Entity
@Table(name = "sales_invoices")
@Getter
@Setter
@NoArgsConstructor
public class SalesInvoice extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "invoice_number", length = 20, nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private SalesInvoiceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_form", length = 10, nullable = false)
    private PaymentForm paymentForm = PaymentForm.CASH;

    @Column(name = "credit_term_days", nullable = false)
    private int creditTermDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 15)
    private InvoicePaymentMethod paymentMethod;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "total_discounts", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalDiscounts = BigDecimal.ZERO;

    @Column(name = "total_taxes", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalTaxes = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── Facturación electrónica DIAN (preparado, sin lógica) ──────────────────
    @Column(length = 100)
    private String cufe;

    @Column(name = "qr_data", columnDefinition = "TEXT")
    private String qrData;

    @Column(name = "dian_resolution", length = 100)
    private String dianResolution;

    @Column(name = "dian_range", length = 100)
    private String dianRange;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesInvoiceLine> lines = new ArrayList<>();

    // ── Fábrica y ciclo de vida ────────────────────────────────────────────────

    /** El primer estado del flujo es BORRADOR (decisión de negocio). */
    public static SalesInvoice draft(String invoiceNumber, SalesOrder order, String notes) {
        SalesInvoice inv = new SalesInvoice();
        inv.id = UUID.randomUUID();
        inv.invoiceNumber = invoiceNumber;
        inv.salesOrder = order;
        inv.customer = order.getCustomer();
        inv.status = SalesInvoiceStatus.DRAFT;
        inv.notes = notes;
        return inv;
    }

    public void addLine(SalesInvoiceLine line) {
        line.setInvoice(this);
        lines.add(line);
    }

    /** Recalcula subtotal, descuentos, impuestos y total desde las líneas activas. */
    public void recomputeTotals() {
        BigDecimal sub = BigDecimal.ZERO;
        BigDecimal disc = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        for (SalesInvoiceLine l : lines) {
            if (l.getDeletedAt() != null) continue;
            sub = sub.add(l.gross());
            disc = disc.add(l.discountAmount());
            tax = tax.add(l.taxAmount());
        }
        this.subtotal = sub;
        this.totalDiscounts = disc;
        this.totalTaxes = tax;
        this.total = sub.subtract(disc).add(tax);
    }

    /** BORRADOR → EMITIDA: fija emisión y vencimiento según la forma de pago. */
    public void emit(PaymentForm form, int termDays, InvoicePaymentMethod method) {
        if (status != SalesInvoiceStatus.DRAFT) {
            throw new IllegalArgumentException("Solo un borrador puede emitirse (estado actual: " + status + ")");
        }
        this.paymentForm = form != null ? form : PaymentForm.CASH;
        this.creditTermDays = this.paymentForm == PaymentForm.CREDIT ? Math.max(termDays, 0) : 0;
        this.paymentMethod = method;
        this.status = SalesInvoiceStatus.ISSUED;
        this.issuedAt = Instant.now();
        this.dueDate = LocalDate.now().plusDays(this.creditTermDays);
    }

    /** Deriva el estado de pago a partir de la suma de pagos registrados. */
    public void applyPaymentProgress(BigDecimal paidSum) {
        if (status != SalesInvoiceStatus.ISSUED && status != SalesInvoiceStatus.PARTIALLY_PAID) {
            throw new IllegalArgumentException("Solo una factura emitida admite pagos (estado: " + status + ")");
        }
        if (paidSum.compareTo(total) >= 0) {
            this.status = SalesInvoiceStatus.PAID;
            this.paidAt = Instant.now();
        } else if (paidSum.compareTo(BigDecimal.ZERO) > 0) {
            this.status = SalesInvoiceStatus.PARTIALLY_PAID;
        }
    }

    /** Revierte el progreso de pago tras anular un recibo: el estado vuelve a derivarse de la suma. */
    public void revertPaymentProgress(BigDecimal paidSum) {
        if (status != SalesInvoiceStatus.ISSUED && status != SalesInvoiceStatus.PARTIALLY_PAID
                && status != SalesInvoiceStatus.PAID) {
            throw new IllegalArgumentException("No se puede revertir un pago en estado " + status);
        }
        if (paidSum.compareTo(total) >= 0) {
            this.status = SalesInvoiceStatus.PAID;
        } else if (paidSum.compareTo(BigDecimal.ZERO) > 0) {
            this.status = SalesInvoiceStatus.PARTIALLY_PAID;
            this.paidAt = null;
        } else {
            this.status = SalesInvoiceStatus.ISSUED;
            this.paidAt = null;
        }
    }

    /** Cancelable en cualquier estado no cancelado; el servicio decide si genera nota crédito. */
    public void cancel(String reason) {
        if (status == SalesInvoiceStatus.CANCELLED) {
            throw new IllegalArgumentException("La factura ya está cancelada");
        }
        this.status = SalesInvoiceStatus.CANCELLED;
        this.cancelReason = reason;
    }

    /** VENCIDA (derivado): emitida o con pago parcial y fecha de vencimiento pasada. */
    public boolean isOverdue() {
        return (status == SalesInvoiceStatus.ISSUED || status == SalesInvoiceStatus.PARTIALLY_PAID)
                && dueDate != null && dueDate.isBefore(LocalDate.now());
    }
}
