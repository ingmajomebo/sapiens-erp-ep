package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.sales.api.dto.SalesInvoiceDtos.*;
import com.sapiens.erp.shared.api.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.event.InvoiceCancelledEvent;
import com.sapiens.erp.modules.sales.domain.event.InvoiceEmittedEvent;
import com.sapiens.erp.modules.sales.domain.exception.SalesOrderNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Facturación de ventas. Flujo: el pedido genera un BORRADOR con las líneas congeladas;
 * al emitir se fijan forma de pago, emisión y vencimiento; los pagos (parciales o totales)
 * derivan PAGO_PARCIAL/PAGADA; cancelar una emitida o pagada genera nota crédito.
 * Todo cambio de estado queda en el historial con usuario y motivo.
 */
@Service
@RequiredArgsConstructor
public class SalesInvoiceService {

    private final SalesInvoiceRepository invoiceRepository;
    private final SalesOrderRepository orderRepository;
    private final SalesInvoicePaymentRepository paymentRepository;
    private final SalesInvoiceHistoryRepository historyRepository;
    private final CreditNoteRepository creditNoteRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InvoiceListResponse> listFiltered(String statusStr) {
        SalesInvoiceStatus status = statusStr != null ? SalesInvoiceStatus.valueOf(statusStr) : null;
        List<SalesInvoice> invoices = invoiceRepository.findFiltered(status);
        Map<UUID, BigDecimal> paidByInvoice = paidSums(invoices);
        return invoices.stream()
                .map(inv -> InvoiceListResponse.from(inv, paidByInvoice.get(inv.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponse getDetail(UUID id) {
        SalesInvoice inv = findActive(id);
        BigDecimal paid = paymentRepository.sumByInvoiceId(id);

        Map<String, BigDecimal> taxesByRate = new LinkedHashMap<>();
        for (SalesInvoiceLine l : inv.getLines()) {
            if (l.getDeletedAt() != null) continue;
            String rate = l.getTaxRate().stripTrailingZeros().toPlainString() + "%";
            taxesByRate.merge(rate, l.taxAmount(), BigDecimal::add);
        }

        return new InvoiceDetailResponse(
                InvoiceListResponse.from(inv, paid),
                inv.getSubtotal(), inv.getTotalDiscounts(), inv.getTotalTaxes(), taxesByRate,
                inv.getCreditTermDays(), inv.getPaymentMethod(), inv.getNotes(),
                inv.getCustomer() != null ? inv.getCustomer().getEmail() : null,
                inv.getCustomer() != null ? inv.getCustomer().getPhone() : null,
                inv.getLines().stream().filter(l -> l.getDeletedAt() == null)
                        .map(InvoiceLineResponse::from).toList(),
                paymentRepository.findByInvoiceId(id).stream().map(PaymentResponse::from).toList(),
                historyRepository.findByInvoiceId(id).stream().map(HistoryResponse::from).toList(),
                creditNoteRepository.findByInvoiceId(id).stream().map(CreditNoteResponse::from).toList()
        );
    }

    /** Columnas ordenables permitidas (whitelist para evitar inyección en el sort). */
    private static final Set<String> SORTABLE = Set.of("invoiceNumber", "issuedAt", "dueDate", "total", "status", "createdAt");

    public record SearchParams(String q, List<SalesInvoiceStatus> statuses, UUID customerId,
                               LocalDate from, LocalDate to, BigDecimal minTotal, BigDecimal maxTotal,
                               boolean overdueOnly) {}

    @Transactional(readOnly = true)
    public PagedResponse<InvoiceListResponse> search(SearchParams params, int page, int size,
                                                     String sortField, String sortDir) {
        String field = SORTABLE.contains(sortField) ? sortField : "createdAt";
        Sort sort = "asc".equalsIgnoreCase(sortDir) ? Sort.by(field).ascending() : Sort.by(field).descending();

        Page<SalesInvoice> result = invoiceRepository.search(
                normalizeQuery(params.q()),
                params.statuses() == null || params.statuses().isEmpty() ? null : params.statuses(),
                params.customerId(),
                toStartInstant(params.from()), toEndInstant(params.to()),
                params.minTotal(), params.maxTotal(), params.overdueOnly(),
                PageRequest.of(page, size, sort));

        Map<UUID, BigDecimal> paidByInvoice = paidSums(result.getContent());
        List<InvoiceListResponse> content = result.getContent().stream()
                .map(inv -> InvoiceListResponse.from(inv, paidByInvoice.get(inv.getId())))
                .toList();
        return new PagedResponse<>(content, page, size, result.getTotalElements());
    }

    public record Summary(long drafts, long issued, long partiallyPaid, long paid, long cancelled,
                          long overdue, BigDecimal pendingBalance, BigDecimal overdueBalance,
                          BigDecimal paidTotal, long total) {}

    /**
     * KPIs sobre el mismo filtro. Se calcula sobre el conjunto filtrado completo:
     * el volumen de facturas de una pescadería no justifica agregaciones materializadas.
     */
    @Transactional(readOnly = true)
    public Summary summary(SearchParams params) {
        List<SalesInvoice> all = invoiceRepository.search(
                normalizeQuery(params.q()),
                params.statuses() == null || params.statuses().isEmpty() ? null : params.statuses(),
                params.customerId(),
                toStartInstant(params.from()), toEndInstant(params.to()),
                params.minTotal(), params.maxTotal(), params.overdueOnly(),
                PageRequest.of(0, Integer.MAX_VALUE)).getContent();

        Map<UUID, BigDecimal> paidByInvoice = paidSums(all);
        long drafts = 0, issued = 0, partial = 0, paid = 0, cancelled = 0, overdue = 0;
        BigDecimal pendingBalance = BigDecimal.ZERO, overdueBalance = BigDecimal.ZERO, paidTotal = BigDecimal.ZERO;
        for (SalesInvoice inv : all) {
            BigDecimal balance = inv.getTotal().subtract(paidByInvoice.getOrDefault(inv.getId(), BigDecimal.ZERO));
            switch (inv.getStatus()) {
                case DRAFT -> drafts++;
                case ISSUED -> { issued++; pendingBalance = pendingBalance.add(balance); }
                case PARTIALLY_PAID -> { partial++; pendingBalance = pendingBalance.add(balance); }
                case PAID -> { paid++; paidTotal = paidTotal.add(inv.getTotal()); }
                case CANCELLED -> cancelled++;
            }
            if (inv.isOverdue()) { overdue++; overdueBalance = overdueBalance.add(balance); }
        }
        return new Summary(drafts, issued, partial, paid, cancelled, overdue,
                pendingBalance, overdueBalance, paidTotal, all.size());
    }

    private String normalizeQuery(String q) {
        return q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase() + "%";
    }

    private Instant toStartInstant(LocalDate d) {
        return d == null ? null : d.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private Instant toEndInstant(LocalDate d) {
        return d == null ? null : d.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    // ── Flujo ─────────────────────────────────────────────────────────────────

    /** Genera el BORRADOR desde el pedido, congelando las líneas (IVA 0% por defecto, editable al emitir). */
    @Transactional
    public InvoiceListResponse createDraftForOrder(UUID orderId) {
        SalesOrder order = orderRepository.findByIdAndDeletedAtIsNull(orderId)
                .orElseThrow(() -> new SalesOrderNotFoundException(orderId));
        if (order.getStatus() == SalesOrderStatus.CANCELLED) {
            throw new IllegalArgumentException("No se puede facturar un pedido cancelado");
        }
        if (!invoiceRepository.findActiveByOrderIds(List.of(orderId)).isEmpty()) {
            throw new IllegalArgumentException("El pedido " + order.getOrderNumber() + " ya tiene una factura activa");
        }

        SalesInvoice invoice = SalesInvoice.draft(nextInvoiceNumber(), order, null);
        for (SalesOrderLine ol : order.getLines()) {
            if (ol.getDeletedAt() != null) continue;
            invoice.addLine(SalesInvoiceLine.create(ol.getProduct(), ol.getProductName(),
                    ol.getQuantity(), ol.getUnitPrice(), BigDecimal.ZERO, BigDecimal.ZERO));
        }
        invoice.recomputeTotals();
        invoiceRepository.save(invoice);
        recordHistory(invoice, null, SalesInvoiceStatus.DRAFT, "Borrador generado desde el pedido " + order.getOrderNumber());
        return InvoiceListResponse.from(invoice, BigDecimal.ZERO);
    }

    /** BORRADOR → EMITIDA. */
    @Transactional
    public InvoiceListResponse emit(UUID id, EmitRequest req) {
        SalesInvoice inv = findActive(id);
        SalesInvoiceStatus from = inv.getStatus();
        inv.emit(req.paymentForm(), req.creditTermDays() != null ? req.creditTermDays() : 0, req.paymentMethod());
        invoiceRepository.save(inv);
        recordHistory(inv, from, inv.getStatus(), null);
        // Finance abre la CxC en la misma transacción (listener síncrono)
        eventPublisher.publishEvent(new InvoiceEmittedEvent(inv.getId(), inv.getInvoiceNumber(),
                inv.getCustomer() != null ? inv.getCustomer().getId() : null,
                inv.getTotal(), inv.getDueDate()));
        return InvoiceListResponse.from(inv, paymentRepository.sumByInvoiceId(id));
    }

    /** Registra un pago (parcial o total) validando que no exceda el saldo. */
    @Transactional
    public InvoiceListResponse registerPayment(UUID id, PaymentRequest req) {
        SalesInvoice inv = findActive(id);
        SalesInvoiceStatus from = inv.getStatus();
        if (from != SalesInvoiceStatus.ISSUED && from != SalesInvoiceStatus.PARTIALLY_PAID) {
            throw new IllegalArgumentException("Solo una factura emitida admite pagos (estado: " + from + ")");
        }

        BigDecimal paidSoFar = paymentRepository.sumByInvoiceId(id);
        BigDecimal balance = inv.getTotal().subtract(paidSoFar);
        if (req.amount().compareTo(balance) > 0) {
            throw new IllegalArgumentException("El pago excede el saldo pendiente (" + balance + ")");
        }

        paymentRepository.save(SalesInvoicePayment.create(inv, req.amount(), req.paymentMethod(),
                req.paidOn(), req.reference(), req.notes()));
        BigDecimal newPaid = paidSoFar.add(req.amount());
        inv.applyPaymentProgress(newPaid);
        invoiceRepository.save(inv);
        if (inv.getStatus() != from) {
            recordHistory(inv, from, inv.getStatus(),
                    "Pago registrado por " + req.amount().stripTrailingZeros().toPlainString());
        }
        return InvoiceListResponse.from(inv, newPaid);
    }

    /** Compatibilidad: pagar el saldo completo en efectivo (usado por el flujo simple). */
    @Transactional
    public InvoiceListResponse payRemaining(UUID id) {
        SalesInvoice inv = findActive(id);
        BigDecimal balance = inv.getTotal().subtract(paymentRepository.sumByInvoiceId(id));
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("La factura no tiene saldo pendiente");
        }
        return registerPayment(id, new PaymentRequest(balance, InvoicePaymentMethod.CASH, null, null, null, null));
    }

    /** Cancela con novedad; si estaba emitida, con pago parcial o pagada, genera nota crédito. */
    @Transactional
    public InvoiceListResponse cancel(UUID id, String reason) {
        SalesInvoice inv = findActive(id);
        SalesInvoiceStatus from = inv.getStatus();
        inv.cancel(reason.trim());
        invoiceRepository.save(inv);
        recordHistory(inv, from, SalesInvoiceStatus.CANCELLED, reason.trim());

        if (from == SalesInvoiceStatus.ISSUED || from == SalesInvoiceStatus.PARTIALLY_PAID
                || from == SalesInvoiceStatus.PAID) {
            creditNoteRepository.save(CreditNote.issue(nextNoteNumber(), inv, reason.trim()));
            // TODO(contabilidad): registrar el asiento inverso cuando exista el módulo de asientos
        }
        // Finance saca la CxC de cartera en la misma transacción
        eventPublisher.publishEvent(new InvoiceCancelledEvent(inv.getId()));
        return InvoiceListResponse.from(inv, paymentRepository.sumByInvoiceId(id));
    }

    // ── API pública para el módulo de Cuentas por Cobrar ─────────────────────

    /**
     * Espeja en la factura un abono aplicado vía recibo de caja (reference = RC-NNNNNN).
     * Mantiene una sola fuente de estados de la factura.
     */
    @Transactional
    public void registerExternalPayment(UUID invoiceId, BigDecimal amount,
                                        InvoicePaymentMethod method, String reference) {
        registerPayment(invoiceId, new PaymentRequest(amount, method, null, reference, null, null));
    }

    /** Respuesta liviana de una factura (para endpoints que delegan en otros módulos). */
    @Transactional(readOnly = true)
    public InvoiceListResponse listResponse(UUID invoiceId) {
        SalesInvoice inv = findActive(invoiceId);
        return InvoiceListResponse.from(inv, paymentRepository.sumByInvoiceId(invoiceId));
    }

    /** Revierte los pagos espejados de un recibo anulado y re-deriva el estado. */
    @Transactional
    public void revertExternalPayments(UUID invoiceId, String reference, String voidReason) {
        SalesInvoice inv = findActive(invoiceId);
        List<SalesInvoicePayment> mirrored =
                paymentRepository.findActiveByInvoiceIdAndReference(invoiceId, reference);
        if (mirrored.isEmpty()) return;

        for (SalesInvoicePayment p : mirrored) {
            p.softDelete();
            paymentRepository.save(p);
        }
        SalesInvoiceStatus from = inv.getStatus();
        BigDecimal newPaid = paymentRepository.sumByInvoiceId(invoiceId);
        inv.revertPaymentProgress(newPaid);
        invoiceRepository.save(inv);
        if (inv.getStatus() != from) {
            recordHistory(inv, from, inv.getStatus(), "Recibo " + reference + " anulado: " + voidReason);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<UUID, BigDecimal> paidSums(List<SalesInvoice> invoices) {
        Map<UUID, BigDecimal> map = new HashMap<>();
        if (invoices.isEmpty()) return map;
        List<UUID> ids = invoices.stream().map(SalesInvoice::getId).toList();
        for (Object[] row : paymentRepository.sumByInvoiceIds(ids)) {
            map.put((UUID) row[0], (BigDecimal) row[1]);
        }
        return map;
    }

    private void recordHistory(SalesInvoice inv, SalesInvoiceStatus from, SalesInvoiceStatus to, String reason) {
        historyRepository.save(SalesInvoiceHistory.record(inv, from, to, reason, currentPrincipal()));
    }

    private SalesInvoice findActive(UUID id) {
        return invoiceRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Factura no encontrada: " + id));
    }

    private String nextInvoiceNumber() {
        return String.format("FV-%06d", invoiceRepository.nextInvoiceNumberValue());
    }

    private String nextNoteNumber() {
        return String.format("NC-%06d", creditNoteRepository.nextNoteNumberValue());
    }

    /** Email del usuario autenticado (mismo patrón que ventas/QA: UUID del JWT resuelto vía identity). */
    private String currentPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        try {
            return userRepository.findById(UUID.fromString(auth.getName()))
                    .map(u -> u.getEmail())
                    .orElse(auth.getName());
        } catch (IllegalArgumentException notAUuid) {
            return auth.getName();
        }
    }
}
