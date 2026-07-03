package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Auditoría: cada cambio de estado de la factura con usuario, fecha y motivo. */
@Entity
@Table(name = "sales_invoice_history")
@Getter
@Setter
@NoArgsConstructor
public class SalesInvoiceHistory extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private SalesInvoiceStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private SalesInvoiceStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_by", length = 150)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    public static SalesInvoiceHistory record(SalesInvoice invoice, SalesInvoiceStatus from,
                                             SalesInvoiceStatus to, String reason, String changedBy) {
        SalesInvoiceHistory h = new SalesInvoiceHistory();
        h.id = UUID.randomUUID();
        h.invoice = invoice;
        h.fromStatus = from;
        h.toStatus = to;
        h.reason = reason;
        h.changedBy = changedBy;
        h.changedAt = Instant.now();
        return h;
    }
}
