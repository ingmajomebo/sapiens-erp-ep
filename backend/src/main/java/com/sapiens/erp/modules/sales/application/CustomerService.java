package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.CustomerDetailResponse;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.CustomerListItem;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.MonthlyTotal;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.PurchaseHistoryItem;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.SegmentSummary;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.UpsertRequest;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.CustomerRequest;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.CustomerResponse;
import com.sapiens.erp.modules.sales.application.CustomerMetricsService.Metrics;
import com.sapiens.erp.modules.sales.domain.Customer;
import com.sapiens.erp.modules.sales.domain.CustomerRepository;
import com.sapiens.erp.modules.sales.domain.CustomerSegment;
import com.sapiens.erp.modules.sales.domain.SalesInvoice;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceRepository;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus;
import com.sapiens.erp.modules.sales.domain.SalesOrder;
import com.sapiens.erp.modules.sales.domain.SalesOrderRepository;
import com.sapiens.erp.shared.api.PagedResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMetricsService metricsService;
    private final SalesOrderRepository orderRepository;
    private final SalesInvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public List<CustomerResponse> listAll() {
        return customerRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @Transactional
    public CustomerResponse create(CustomerRequest req) {
        Customer customer = Customer.create(req.name().trim(), req.email(), req.phone(), false);
        return CustomerResponse.from(customerRepository.save(customer));
    }

    // ── Módulo Clientes ───────────────────────────────────────────────────────

    public record SearchParams(String q, List<CustomerSegment> segments,
                               Integer minDaysSinceLastPurchase, boolean pendingOnly) {}

    /**
     * Búsqueda con métricas. El filtrado y la paginación se hacen en memoria
     * porque los segmentos y métricas son derivados; el volumen de clientes
     * de una pescadería lo permite.
     */
    @Transactional(readOnly = true)
    public PagedResponse<CustomerListItem> search(SearchParams params, int page, int size) {
        List<CustomerListItem> all = listWithMetrics(params);
        int fromIdx = Math.min(page * size, all.size());
        int toIdx = Math.min(fromIdx + size, all.size());
        return new PagedResponse<>(all.subList(fromIdx, toIdx), page, size, all.size());
    }

    @Transactional(readOnly = true)
    public SegmentSummary summary() {
        List<CustomerListItem> all = listWithMetrics(new SearchParams(null, null, null, false));
        Map<CustomerSegment, Long> bySegment = new EnumMap<>(CustomerSegment.class);
        for (CustomerSegment s : CustomerSegment.values()) bySegment.put(s, 0L);
        BigDecimal pending = BigDecimal.ZERO;
        for (CustomerListItem c : all) {
            bySegment.merge(c.segment(), 1L, Long::sum);
            pending = pending.add(c.pendingBalance());
        }
        return new SegmentSummary(all.size(), bySegment, pending);
    }

    @Transactional(readOnly = true)
    public CustomerDetailResponse getDetail(UUID id) {
        Customer customer = customerRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado: " + id));
        Metrics metrics = metricsService.metricsFor(id);

        List<SalesOrder> orders = orderRepository.findByCustomerId(id);
        List<SalesInvoice> invoices = invoiceRepository.findByCustomerId(id);
        Map<UUID, SalesInvoice> invoiceByOrder = new HashMap<>();
        for (SalesInvoice inv : invoices) {
            if (inv.getStatus() != SalesInvoiceStatus.CANCELLED) {
                invoiceByOrder.putIfAbsent(inv.getSalesOrder().getId(), inv);
            }
        }

        List<PurchaseHistoryItem> purchases = orders.stream()
                .map(o -> {
                    SalesInvoice inv = invoiceByOrder.get(o.getId());
                    return new PurchaseHistoryItem(o.getId(), o.getOrderNumber(), o.getStatus().name(),
                            o.getCreatedAt(), o.total(),
                            inv != null ? inv.getId() : null,
                            inv != null ? inv.getInvoiceNumber() : null,
                            inv != null ? inv.getStatus().name() : null);
                })
                .toList();

        return new CustomerDetailResponse(
                CustomerListItem.from(customer, metrics),
                customer.getAddress(), customer.getNotes(),
                purchases, monthlyTotals(invoices, 12));
    }

    @Transactional
    public CustomerListItem createFull(UpsertRequest req) {
        validateDocument(req, null);
        Customer c = Customer.create(req.name().trim(), req.email(), req.phone(), false);
        applyFields(c, req);
        customerRepository.save(c);
        return CustomerListItem.from(c, Metrics.EMPTY);
    }

    @Transactional
    public CustomerListItem update(UUID id, UpsertRequest req) {
        Customer c = customerRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado: " + id));
        validateDocument(req, id);
        c.setName(req.name().trim());
        c.setEmail(req.email());
        c.setPhone(req.phone());
        applyFields(c, req);
        return CustomerListItem.from(c, metricsService.metricsFor(id));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<CustomerListItem> listWithMetrics(SearchParams params) {
        Map<UUID, Metrics> metrics = metricsService.metricsForAll();
        String q = params.q() != null && !params.q().isBlank() ? params.q().trim().toLowerCase() : null;
        Set<CustomerSegment> segments = params.segments() != null && !params.segments().isEmpty()
                ? Set.copyOf(params.segments()) : null;

        List<CustomerListItem> result = new ArrayList<>();
        for (Customer c : customerRepository.findAllByDeletedAtIsNullOrderByNameAsc()) {
            Metrics m = metrics.getOrDefault(c.getId(), Metrics.EMPTY);
            if (q != null
                    && !c.getName().toLowerCase().contains(q)
                    && (c.getDocumentNumber() == null || !c.getDocumentNumber().toLowerCase().contains(q))
                    && (c.getLegalName() == null || !c.getLegalName().toLowerCase().contains(q))) {
                continue;
            }
            if (segments != null && !segments.contains(m.segment())) continue;
            if (params.minDaysSinceLastPurchase() != null
                    && (m.daysSinceLastPurchase() == null
                        || m.daysSinceLastPurchase() < params.minDaysSinceLastPurchase())) {
                continue;
            }
            if (params.pendingOnly() && m.pendingBalance().signum() <= 0) continue;
            result.add(CustomerListItem.from(c, m));
        }
        result.sort(Comparator.comparing(CustomerListItem::totalInvoiced).reversed());
        return result;
    }

    /** Facturado por mes de los últimos N meses (excluye borradores y canceladas). */
    private List<MonthlyTotal> monthlyTotals(List<SalesInvoice> invoices, int months) {
        ZoneId zone = ZoneId.systemDefault();
        YearMonth current = YearMonth.from(LocalDate.now(zone));
        Map<YearMonth, BigDecimal> byMonth = new HashMap<>();
        for (SalesInvoice inv : invoices) {
            if (inv.getStatus() == SalesInvoiceStatus.DRAFT || inv.getStatus() == SalesInvoiceStatus.CANCELLED) continue;
            Instant ref = inv.getIssuedAt() != null ? inv.getIssuedAt() : inv.getCreatedAt();
            YearMonth ym = YearMonth.from(ref.atZone(zone).toLocalDate());
            byMonth.merge(ym, inv.getTotal(), BigDecimal::add);
        }
        List<MonthlyTotal> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            result.add(new MonthlyTotal(ym.toString(), byMonth.getOrDefault(ym, BigDecimal.ZERO)));
        }
        return result;
    }

    private void applyFields(Customer c, UpsertRequest req) {
        boolean hasType = req.documentType() != null;
        boolean hasNumber = req.documentNumber() != null && !req.documentNumber().isBlank();
        if (hasType != hasNumber) {
            throw new IllegalArgumentException("Tipo y número de documento deben indicarse juntos");
        }
        c.setDocumentType(req.documentType());
        c.setDocumentNumber(hasNumber ? req.documentNumber().trim() : null);
        c.setLegalName(req.legalName());
        c.setAddress(req.address());
        c.setCity(req.city());
        c.setDefaultPaymentTermDays(req.defaultPaymentTermDays());
        c.setNotes(req.notes());
    }

    private void validateDocument(UpsertRequest req, UUID selfId) {
        if (req.documentType() == null || req.documentNumber() == null || req.documentNumber().isBlank()) return;
        String number = req.documentNumber().trim();
        boolean exists = selfId == null
                ? customerRepository.existsByDocumentTypeAndDocumentNumberAndDeletedAtIsNull(req.documentType(), number)
                : customerRepository.existsByDocumentTypeAndDocumentNumberAndIdNotAndDeletedAtIsNull(req.documentType(), number, selfId);
        if (exists) {
            throw new IllegalArgumentException(
                    "Ya existe un cliente con documento " + req.documentType() + " " + number);
        }
    }
}
