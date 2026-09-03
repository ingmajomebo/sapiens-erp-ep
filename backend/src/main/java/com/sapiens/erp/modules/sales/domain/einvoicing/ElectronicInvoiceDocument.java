package com.sapiens.erp.modules.sales.domain.einvoicing;

import com.sapiens.erp.modules.sales.domain.SalesInvoice;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Rastro de una factura ante la DIAN: qué se envió, cuándo y en qué quedó. */
@Entity
@Table(name = "electronic_invoice_documents")
@Getter
@Setter
@NoArgsConstructor
public class ElectronicInvoiceDocument extends AuditableEntity {

    /** Un mensaje de error de la DIAN puede venir enorme; la columna es TEXT
     *  pero guardar páginas enteras no ayuda a nadie a leer el problema. */
    private static final int MAX_MESSAGE = 4000;

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false, unique = true)
    private SalesInvoice invoice;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(nullable = false, length = 20)
    private String environment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ElectronicInvoiceStatus status = ElectronicInvoiceStatus.PENDING;

    @Column(name = "resolution_number", length = 50)
    private String resolutionNumber;

    @Column(length = 10)
    private String prefix;

    @Column(name = "document_number", length = 30)
    private String documentNumber;

    @Column(length = 200)
    private String cufe;

    @Column(name = "qr_url", columnDefinition = "TEXT")
    private String qrUrl;

    @Column(name = "pdf_url", columnDefinition = "TEXT")
    private String pdfUrl;

    @Column(name = "xml_url", columnDefinition = "TEXT")
    private String xmlUrl;

    @Column(name = "dian_status_code", length = 10)
    private String dianStatusCode;

    @Column(name = "dian_message", columnDefinition = "TEXT")
    private String dianMessage;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    /** Nace PENDIENTE al emitir la factura, antes de hablar con nadie. */
    public static ElectronicInvoiceDocument pending(SalesInvoice invoice, String provider,
                                                    String environment, IssuerData issuer) {
        ElectronicInvoiceDocument d = new ElectronicInvoiceDocument();
        d.id = UUID.randomUUID();
        d.invoice = invoice;
        d.provider = provider;
        d.environment = environment;
        d.status = ElectronicInvoiceStatus.PENDING;
        d.resolutionNumber = issuer.resolutionNumber();
        d.prefix = issuer.prefix();
        d.documentNumber = invoice.getInvoiceNumber();
        return d;
    }

    /** Registra el veredicto del proveedor. */
    public void applyResult(SubmissionResult result) {
        this.status = result.status();
        this.dianStatusCode = result.dianCode();
        this.dianMessage = truncate(result.dianMessage());
        this.submittedAt = Instant.now();

        // Solo se sobrescriben las urls y el CUFE cuando vienen con valor: una
        // consulta de estado posterior puede confirmar la aceptación sin
        // repetir los enlaces, y perderlos dejaría la factura sin PDF.
        if (result.cufe() != null) this.cufe = result.cufe();
        if (result.qrUrl() != null) this.qrUrl = result.qrUrl();
        if (result.pdfUrl() != null) this.pdfUrl = result.pdfUrl();
        if (result.xmlUrl() != null) this.xmlUrl = result.xmlUrl();

        if (result.status() == ElectronicInvoiceStatus.ACCEPTED) {
            this.acceptedAt = Instant.now();
            this.lastError = null;
        }
    }

    /** Registra que no se pudo hablar con el proveedor. */
    public void applyFailure(String error) {
        this.status = ElectronicInvoiceStatus.FAILED;
        this.lastError = truncate(error);
        this.submittedAt = Instant.now();
    }

    public void countAttempt() {
        this.attempts++;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= MAX_MESSAGE ? s : s.substring(0, MAX_MESSAGE) + "…";
    }
}
