package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Nota crédito NC-NNNNNN: corrección contable al cancelar una factura emitida o pagada.
 * TODO(contabilidad): cuando exista el módulo de asientos, generar aquí el asiento inverso.
 */
@Entity
@Table(name = "credit_notes")
@Getter
@Setter
@NoArgsConstructor
public class CreditNote extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "note_number", length = 20, nullable = false, unique = true)
    private String noteNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SalesInvoice invoice;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal total;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    public static CreditNote issue(String noteNumber, SalesInvoice invoice, String reason) {
        CreditNote nc = new CreditNote();
        nc.id = UUID.randomUUID();
        nc.noteNumber = noteNumber;
        nc.invoice = invoice;
        nc.reason = reason;
        nc.total = invoice.getTotal();
        nc.issuedAt = Instant.now();
        return nc;
    }
}
