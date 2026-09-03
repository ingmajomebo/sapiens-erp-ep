package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.application.ElectronicInvoicingService;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoiceDocument;
import com.sapiens.erp.modules.sales.infrastructure.einvoicing.EInvoicingProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Estado de cada factura ante la DIAN, y reintento manual.
 *
 * <p>El envío normal ocurre solo al emitir. Estos endpoints existen para los
 * casos en que algo falló: el proveedor estaba caído, faltaba un dato del
 * cliente, o la DIAN respondió "en proceso" y hay que volver a preguntar.
 */
@RestController
@RequestMapping("/api/v1/sales-invoices")
@RequiredArgsConstructor
public class ElectronicInvoicingController {

    private final ElectronicInvoicingService service;
    private final EInvoicingProperties properties;

    /** Lo que se muestra en pantalla junto a la factura. */
    public record ElectronicStatusResponse(
            boolean enabled,
            String provider,
            String environment,
            String status,
            String cufe,
            String pdfUrl,
            String qrUrl,
            String xmlUrl,
            String dianCode,
            String dianMessage,
            String lastError,
            int attempts,
            Instant submittedAt,
            Instant acceptedAt,
            boolean retryable
    ) {
        static ElectronicStatusResponse of(ElectronicInvoiceDocument d) {
            return new ElectronicStatusResponse(
                    true, d.getProvider(), d.getEnvironment(), d.getStatus().name(),
                    d.getCufe(), d.getPdfUrl(), d.getQrUrl(), d.getXmlUrl(),
                    d.getDianStatusCode(), d.getDianMessage(), d.getLastError(),
                    d.getAttempts(), d.getSubmittedAt(), d.getAcceptedAt(),
                    d.getStatus().isRetryable() || d.getStatus().awaitsVerdict());
        }

        /** Cuando no hay proveedor, o la factura aún no tiene documento. */
        static ElectronicStatusResponse disabled(String provider, String environment,
                                                  boolean enabled) {
            return new ElectronicStatusResponse(enabled, provider, environment,
                    "NOT_SENT", null, null, null, null, null, null, null,
                    0, null, null, enabled);
        }
    }

    @GetMapping("/{id}/electronic")
    @PreAuthorize("hasAuthority('SALES_VIEW')")
    public ResponseEntity<ElectronicStatusResponse> status(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findByInvoice(id)
                .map(ElectronicStatusResponse::of)
                .orElseGet(() -> ElectronicStatusResponse.disabled(
                        service.providerName(), properties.getEnvironment(), service.isEnabled())));
    }

    /** Envía o reintenta. Sobre un documento ya aceptado no hace nada. */
    @PostMapping("/{id}/electronic/submit")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<ElectronicStatusResponse> submit(@PathVariable UUID id) {
        return ResponseEntity.ok(service.submit(id)
                .map(ElectronicStatusResponse::of)
                .orElseGet(() -> ElectronicStatusResponse.disabled(
                        service.providerName(), properties.getEnvironment(), service.isEnabled())));
    }

    /** Vuelve a preguntarle a la DIAN por un documento sin veredicto. */
    @PostMapping("/{id}/electronic/refresh")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<ElectronicStatusResponse> refresh(@PathVariable UUID id) {
        return ResponseEntity.ok(service.refreshStatus(id)
                .map(ElectronicStatusResponse::of)
                .orElseGet(() -> ElectronicStatusResponse.disabled(
                        service.providerName(), properties.getEnvironment(), service.isEnabled())));
    }
}
