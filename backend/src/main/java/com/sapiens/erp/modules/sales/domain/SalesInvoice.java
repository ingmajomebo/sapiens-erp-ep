package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Factura de venta generada desde un pedido, para enviar al cliente. */
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

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private SalesInvoiceStatus status;

    /** Total congelado al emitir (el pedido podría cambiar después). */
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal total;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    public static SalesInvoice issue(String invoiceNumber, SalesOrder order) {
        SalesInvoice inv = new SalesInvoice();
        inv.id = UUID.randomUUID();
        inv.invoiceNumber = invoiceNumber;
        inv.salesOrder = order;
        inv.status = SalesInvoiceStatus.ISSUED;
        inv.total = order.total();
        inv.issuedAt = Instant.now();
        return inv;
    }

    public void markPaid() {
        if (status != SalesInvoiceStatus.ISSUED) {
            throw new IllegalArgumentException("Solo una factura emitida puede marcarse como pagada");
        }
        this.status = SalesInvoiceStatus.PAID;
        this.paidAt = Instant.now();
    }

    public void cancel(String reason) {
        if (status == SalesInvoiceStatus.PAID) {
            throw new IllegalArgumentException("Una factura pagada no puede cancelarse");
        }
        this.status = SalesInvoiceStatus.CANCELLED;
        this.cancelReason = reason;
    }
}
