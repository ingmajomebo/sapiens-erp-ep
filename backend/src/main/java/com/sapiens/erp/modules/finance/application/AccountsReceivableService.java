package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.AgingReportResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.AgingRow;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.AppliedReceiptResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ReceivableDetailResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ReceivableResponse;
import com.sapiens.erp.modules.finance.domain.AccountsReceivable;
import com.sapiens.erp.modules.finance.domain.AccountsReceivableRepository;
import com.sapiens.erp.modules.finance.domain.AgingBucket;
import com.sapiens.erp.modules.finance.domain.ReceiptApplication;
import com.sapiens.erp.modules.finance.domain.ReceiptApplicationRepository;
import com.sapiens.erp.modules.finance.domain.ReceivableStatus;
import com.sapiens.erp.modules.sales.application.CustomerService;
import com.sapiens.erp.modules.sales.domain.event.InvoiceCancelledEvent;
import com.sapiens.erp.modules.sales.domain.event.InvoiceEmittedEvent;
import com.sapiens.erp.shared.api.PagedResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cuentas por Cobrar. La CxC nace al emitirse la factura (evento de sales) y su
 * saldo solo se mueve aplicando recibos de caja ACTIVE. La antigüedad se calcula
 * sobre el saldo pendiente con la due_date original: un abono no reinicia el vencimiento.
 */
@Service
@RequiredArgsConstructor
public class AccountsReceivableService {

    private static final Logger log = LoggerFactory.getLogger(AccountsReceivableService.class);

    private final AccountsReceivableRepository receivableRepository;
    private final ReceiptApplicationRepository applicationRepository;
    private final CustomerService customerService;

    // ── Nace y muere con la factura (eventos de sales, misma transacción) ────

    @EventListener
    @Transactional
    public void onInvoiceEmitted(InvoiceEmittedEvent event) {
        if (event.customerId() == null) {
            log.debug("Factura {} sin cliente identificado: no se abre CxC", event.invoiceNumber());
            return;
        }
        if (receivableRepository.findByInvoiceId(event.invoiceId()).isPresent()) {
            return; // idempotente: nunca CxC duplicadas (además del UNIQUE en BD)
        }
        receivableRepository.save(AccountsReceivable.open(
                event.customerId(), event.invoiceId(), event.invoiceNumber(),
                event.total(), event.dueDate()));
        log.info("CxC abierta para la factura {}", event.invoiceNumber());
    }

    @EventListener
    @Transactional
    public void onInvoiceCancelled(InvoiceCancelledEvent event) {
        receivableRepository.findByInvoiceId(event.invoiceId()).ifPresent(ar -> {
            ar.cancelForVoidedInvoice();
            receivableRepository.save(ar);
            log.info("CxC de la factura {} sacada de cartera (factura anulada)", ar.getInvoiceNumber());
        });
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<ReceivableResponse> listFiltered(UUID customerId, ReceivableStatus status,
                                                          AgingBucket bucket, int page, int size) {
        LocalDate today = LocalDate.now();
        LocalDate dueFrom = null;
        LocalDate dueTo = null;
        if (bucket != null) {
            switch (bucket) {
                case CURRENT -> dueFrom = today;
                case D1_30 -> { dueFrom = today.minusDays(30); dueTo = today.minusDays(1); }
                case D31_60 -> { dueFrom = today.minusDays(60); dueTo = today.minusDays(31); }
                case D60_PLUS -> dueTo = today.minusDays(61);
            }
        }
        Page<AccountsReceivable> result = receivableRepository.findFiltered(
                customerId, status, dueFrom, dueTo, bucket != null, PageRequest.of(page, size));

        Map<UUID, String> names = customerNames(result.getContent());
        List<ReceivableResponse> content = result.getContent().stream()
                .map(ar -> ReceivableResponse.from(ar, names.getOrDefault(ar.getCustomerId(), "—"), today))
                .toList();
        return new PagedResponse<>(content, page, size, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ReceivableDetailResponse getDetail(UUID id) {
        AccountsReceivable ar = findById(id);
        Map<UUID, String> names = customerNames(List.of(ar));
        return new ReceivableDetailResponse(
                ReceivableResponse.from(ar, names.getOrDefault(ar.getCustomerId(), "—"), LocalDate.now()),
                paymentsFor(id));
    }

    @Transactional(readOnly = true)
    public List<AppliedReceiptResponse> paymentsFor(UUID receivableId) {
        findById(receivableId); // 404 si no existe
        return applicationRepository.findByReceivableId(receivableId).stream()
                .map(this::toAppliedReceipt)
                .toList();
    }

    /** Reporte de antigüedad: cartera abierta agrupada por cliente y bucket. */
    @Transactional(readOnly = true)
    public AgingReportResponse aging() {
        LocalDate today = LocalDate.now();
        List<AccountsReceivable> open = receivableRepository.findOpen(null);

        Map<UUID, Map<AgingBucket, BigDecimal>> byCustomer = new LinkedHashMap<>();
        Map<AgingBucket, BigDecimal> totals = new EnumMap<>(AgingBucket.class);
        for (AgingBucket b : AgingBucket.values()) totals.put(b, BigDecimal.ZERO);

        for (AccountsReceivable ar : open) {
            AgingBucket bucket = ar.agingBucket(today);
            byCustomer.computeIfAbsent(ar.getCustomerId(), k -> {
                Map<AgingBucket, BigDecimal> m = new EnumMap<>(AgingBucket.class);
                for (AgingBucket b : AgingBucket.values()) m.put(b, BigDecimal.ZERO);
                return m;
            }).merge(bucket, ar.getPending(), BigDecimal::add);
            totals.merge(bucket, ar.getPending(), BigDecimal::add);
        }

        Map<UUID, String> names = customerService.namesByIds(byCustomer.keySet());
        List<AgingRow> rows = new ArrayList<>();
        for (Map.Entry<UUID, Map<AgingBucket, BigDecimal>> e : byCustomer.entrySet()) {
            Map<AgingBucket, BigDecimal> m = e.getValue();
            BigDecimal rowTotal = m.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            rows.add(new AgingRow(e.getKey(), names.getOrDefault(e.getKey(), "—"),
                    m.get(AgingBucket.CURRENT), m.get(AgingBucket.D1_30),
                    m.get(AgingBucket.D31_60), m.get(AgingBucket.D60_PLUS), rowTotal));
        }
        rows.sort((a, b) -> b.total().compareTo(a.total()));

        BigDecimal totalPending = totals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOverdue = totalPending.subtract(totals.get(AgingBucket.CURRENT));
        return new AgingReportResponse(totalPending, totalOverdue, open.size(), totals, rows);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    AccountsReceivable findById(UUID id) {
        return receivableRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cuenta por cobrar no encontrada: " + id));
    }

    private AppliedReceiptResponse toAppliedReceipt(ReceiptApplication a) {
        var r = a.getReceipt();
        return new AppliedReceiptResponse(r.getId(), r.getNumber(), a.getAmount(), r.getAmount(),
                r.getPaymentMethod(), r.getReference(), r.getStatus(), r.getVoidReason(), r.getReceiptDate());
    }

    private Map<UUID, String> customerNames(List<AccountsReceivable> ars) {
        return customerService.namesByIds(ars.stream().map(AccountsReceivable::getCustomerId).distinct().toList());
    }
}
