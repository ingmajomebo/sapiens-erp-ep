package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.sales.api.dto.SalesInvoiceDtos.*;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.exception.SalesOrderNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
        return registerPayment(id, new PaymentRequest(balance, InvoicePaymentMethod.CASH, null, null, null));
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
        return InvoiceListResponse.from(inv, paymentRepository.sumByInvoiceId(id));
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
