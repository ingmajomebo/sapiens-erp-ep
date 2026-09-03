package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.domain.SalesInvoice;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceRepository;
import com.sapiens.erp.modules.sales.domain.einvoicing.*;
import com.sapiens.erp.modules.sales.infrastructure.einvoicing.EInvoicingProperties;
import com.sapiens.erp.modules.sales.infrastructure.einvoicing.MatiasPayloadMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Lleva las facturas emitidas hasta la DIAN y guarda en qué quedaron.
 *
 * <p><b>Por qué el envío no bloquea la emisión.</b> Emitir descuenta inventario
 * y abre la cuenta por cobrar dentro de una transacción. Meter ahí una llamada
 * HTTP de hasta un minuto significaría mantener bloqueos de base de datos todo
 * ese tiempo, y que una caída del proveedor impidiera vender. La factura se
 * emite, el documento electrónico nace PENDIENTE, y el envío ocurre después de
 * confirmar la transacción.
 *
 * <p>La contrapartida es real y hay que decirla: entre la emisión y la
 * aceptación existe una ventana en la que la factura está entregada al cliente
 * pero aún no radicada. Por eso el estado se muestra en pantalla en vez de
 * esconderse.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ElectronicInvoicingService {

    private final ElectronicInvoicingProvider provider;
    private final ElectronicInvoiceDocumentRepository documentRepository;
    private final SalesInvoiceRepository invoiceRepository;
    private final EInvoicingProperties properties;

    /* ── Consulta ────────────────────────────────────────────────────────── */

    public boolean isEnabled() {
        return provider.isEnabled();
    }

    public String providerName() {
        return provider.name();
    }

    public Optional<ElectronicInvoiceDocument> findByInvoice(UUID invoiceId) {
        return documentRepository.findByInvoiceIdAndDeletedAtIsNull(invoiceId);
    }

    public List<ElectronicInvoiceDocument> findByInvoices(List<UUID> invoiceIds) {
        return invoiceIds.isEmpty() ? List.of() : documentRepository.findByInvoiceIds(invoiceIds);
    }

    /* ── Registro y envío ────────────────────────────────────────────────── */

    /**
     * Crea el documento en estado PENDIENTE. Se llama al emitir, dentro de la
     * misma transacción, para que no exista una factura emitida sin rastro.
     */
    @Transactional
    public void registerPending(SalesInvoice invoice) {
        if (!provider.isEnabled()) return;
        if (documentRepository.findByInvoiceIdAndDeletedAtIsNull(invoice.getId()).isPresent()) return;

        documentRepository.save(ElectronicInvoiceDocument.pending(
                invoice, provider.name(), properties.getEnvironment(), properties.issuerData()));
    }

    /**
     * Envía a la DIAN una factura ya emitida y guarda el veredicto.
     *
     * @return el documento actualizado, o vacío si no hay nada que enviar
     */
    @Transactional
    public Optional<ElectronicInvoiceDocument> submit(UUID invoiceId) {
        if (!provider.isEnabled()) {
            log.debug("Envío omitido: no hay proveedor activo.");
            return Optional.empty();
        }

        SalesInvoice invoice = invoiceRepository.findById(invoiceId).orElse(null);
        if (invoice == null) return Optional.empty();

        ElectronicInvoiceDocument doc = documentRepository
                .findByInvoiceIdAndDeletedAtIsNull(invoiceId)
                .orElseGet(() -> documentRepository.save(ElectronicInvoiceDocument.pending(
                        invoice, provider.name(), properties.getEnvironment(),
                        properties.issuerData())));

        if (doc.getStatus().isFinal()) {
            // Reenviar algo ya aceptado crearía un documento duplicado ante la
            // DIAN, que lo rechazaría y ensuciaría el consecutivo.
            log.debug("La factura {} ya fue aceptada; no se reenvía.", invoice.getInvoiceNumber());
            return Optional.of(doc);
        }

        doc.countAttempt();
        try {
            SubmissionResult result = provider.submit(invoice, properties.issuerData());
            doc.applyResult(result);
            copyToInvoice(invoice, doc);
        } catch (ElectronicInvoicingProvider.ProviderException e) {
            log.warn("Fallo al enviar la factura {}: {}", invoice.getInvoiceNumber(), e.getMessage());
            doc.applyFailure(e.getMessage());
        } catch (MatiasPayloadMapper.MappingException e) {
            // Faltan datos en la factura o el cliente. No es un fallo de red:
            // reintentar sin corregir dará exactamente el mismo resultado, así
            // que se marca RECHAZADA para que alguien lo lea y lo arregle.
            log.warn("La factura {} no se puede armar: {}", invoice.getInvoiceNumber(), e.getMessage());
            doc.applyResult(SubmissionResult.rejected("DATOS", e.getMessage()));
        }

        return Optional.of(documentRepository.save(doc));
    }

    /**
     * Vuelve a preguntarle a la DIAN por un documento sin veredicto.
     *
     * <p>Solo tiene sentido sobre documentos ENVIADOS. Sobre uno aceptado no
     * cambia nada, y sobre uno rechazado tampoco: hay que corregir y reemitir.
     */
    @Transactional
    public Optional<ElectronicInvoiceDocument> refreshStatus(UUID invoiceId) {
        if (!provider.isEnabled()) return Optional.empty();

        ElectronicInvoiceDocument doc = documentRepository
                .findByInvoiceIdAndDeletedAtIsNull(invoiceId).orElse(null);
        if (doc == null || !doc.getStatus().awaitsVerdict()) {
            return Optional.ofNullable(doc);
        }

        try {
            SubmissionResult result = provider.queryStatus(
                    doc.getCufe(), doc.getPrefix(), doc.getDocumentNumber());
            doc.applyResult(result);
            invoiceRepository.findById(invoiceId).ifPresent(inv -> copyToInvoice(inv, doc));
        } catch (ElectronicInvoicingProvider.ProviderException e) {
            // Una consulta fallida NO cambia el estado del documento: sigue
            // enviado, solo que aún no sabemos su veredicto. Marcarlo FALLIDO
            // haría perder el CUFE y con él la posibilidad de volver a
            // preguntar.
            log.warn("No se pudo consultar el estado de {}: {}",
                    doc.getDocumentNumber(), e.getMessage());
            return Optional.of(doc);
        }

        return Optional.of(documentRepository.save(doc));
    }

    /**
     * El CUFE y el QR se copian a la factura porque su PDF ya los imprime, y
     * porque una factura aceptada debe poder mostrarlos sin depender de la
     * tabla de la integración.
     */
    private void copyToInvoice(SalesInvoice invoice, ElectronicInvoiceDocument doc) {
        if (doc.getStatus() != ElectronicInvoiceStatus.ACCEPTED) return;
        invoice.setCufe(doc.getCufe());
        invoice.setQrData(doc.getQrUrl());
        invoice.setDianResolution(doc.getResolutionNumber());
        invoice.setDianRange(doc.getPrefix());
        invoiceRepository.save(invoice);
    }
}
