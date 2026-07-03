package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.domain.CustomerSegment;
import com.sapiens.erp.modules.sales.domain.SalesInvoicePaymentRepository;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceRepository;
import com.sapiens.erp.modules.sales.domain.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Métricas de comportamiento de compra por cliente, calculadas al vuelo
 * (volumen bajo de clientes en una pescadería; no amerita tablas materializadas).
 *
 * Compras = pedidos no cancelados. Facturado = facturas emitidas/pagadas.
 * Saldo pendiente = facturas abiertas menos sus pagos.
 */
@Service
@RequiredArgsConstructor
public class CustomerMetricsService {

    private final SalesOrderRepository orderRepository;
    private final SalesInvoiceRepository invoiceRepository;
    private final SalesInvoicePaymentRepository paymentRepository;

    @Value("${app.customers.segmentation.new-max-purchases:1}")
    private int newMaxPurchases;

    @Value("${app.customers.segmentation.at-risk-days:30}")
    private int atRiskDays;

    @Value("${app.customers.segmentation.inactive-days:90}")
    private int inactiveDays;

    public record Metrics(
            long totalPurchases,
            BigDecimal totalInvoiced,
            BigDecimal avgTicket,
            Instant firstPurchaseAt,
            Instant lastPurchaseAt,
            Long daysSinceLastPurchase,
            Long avgFrequencyDays,
            BigDecimal pendingBalance,
            CustomerSegment segment
    ) {
        public static final Metrics EMPTY = new Metrics(0, BigDecimal.ZERO, BigDecimal.ZERO,
                null, null, null, null, BigDecimal.ZERO, CustomerSegment.NEW);
    }

    /** Métricas de todos los clientes con actividad, en tres consultas agregadas. */
    @Transactional(readOnly = true)
    public Map<UUID, Metrics> metricsForAll() {
        Map<UUID, long[]> orderStats = new HashMap<>();   // [count]
        Map<UUID, Instant[]> orderDates = new HashMap<>(); // [first, last]
        for (Object[] row : orderRepository.purchaseStatsByCustomer()) {
            UUID id = (UUID) row[0];
            orderStats.put(id, new long[]{(Long) row[1]});
            orderDates.put(id, new Instant[]{(Instant) row[2], (Instant) row[3]});
        }

        Map<UUID, BigDecimal> invoiced = new HashMap<>();
        for (Object[] row : invoiceRepository.invoicedTotalsByCustomer()) {
            invoiced.put((UUID) row[0], (BigDecimal) row[1]);
        }
        Map<UUID, BigDecimal> openTotals = new HashMap<>();
        for (Object[] row : invoiceRepository.openTotalsByCustomer()) {
            openTotals.put((UUID) row[0], (BigDecimal) row[1]);
        }
        Map<UUID, BigDecimal> openPayments = new HashMap<>();
        for (Object[] row : paymentRepository.openPaymentsByCustomer()) {
            openPayments.put((UUID) row[0], (BigDecimal) row[1]);
        }

        Map<UUID, Metrics> result = new HashMap<>();
        Instant now = Instant.now();
        for (UUID id : orderStats.keySet()) {
            long purchases = orderStats.get(id)[0];
            Instant first = orderDates.get(id)[0];
            Instant last = orderDates.get(id)[1];
            BigDecimal totalInvoiced = invoiced.getOrDefault(id, BigDecimal.ZERO);
            BigDecimal pending = openTotals.getOrDefault(id, BigDecimal.ZERO)
                    .subtract(openPayments.getOrDefault(id, BigDecimal.ZERO));
            result.put(id, build(purchases, totalInvoiced, first, last, pending, now));
        }
        // Clientes con factura pero sin pedidos activos (caso raro): igual reportan saldo
        for (UUID id : openTotals.keySet()) {
            result.computeIfAbsent(id, k -> build(0,
                    invoiced.getOrDefault(k, BigDecimal.ZERO), null, null,
                    openTotals.getOrDefault(k, BigDecimal.ZERO)
                            .subtract(openPayments.getOrDefault(k, BigDecimal.ZERO)), now));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Metrics metricsFor(UUID customerId) {
        return metricsForAll().getOrDefault(customerId, Metrics.EMPTY);
    }

    private Metrics build(long purchases, BigDecimal totalInvoiced, Instant first, Instant last,
                          BigDecimal pending, Instant now) {
        BigDecimal avgTicket = purchases > 0
                ? totalInvoiced.divide(BigDecimal.valueOf(purchases), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        Long daysSince = last != null ? Duration.between(last, now).toDays() : null;
        Long avgFrequency = (purchases > 1 && first != null && last != null)
                ? Duration.between(first, last).toDays() / (purchases - 1)
                : null;
        CustomerSegment segment = segmentFor(purchases, daysSince, newMaxPurchases, atRiskDays, inactiveDays);
        return new Metrics(purchases, totalInvoiced, avgTicket, first, last, daysSince, avgFrequency,
                pending.max(BigDecimal.ZERO), segment);
    }

    /**
     * Reglas de segmentación (umbrales en días configurables):
     * INACTIVE si superó inactiveDays sin comprar; AT_RISK si superó atRiskDays;
     * NEW si tiene pocas compras (≤ newMaxPurchases) o ninguna; RECURRING en el resto.
     */
    public static CustomerSegment segmentFor(long purchases, Long daysSinceLastPurchase,
                                             int newMaxPurchases, int atRiskDays, int inactiveDays) {
        if (purchases == 0 || daysSinceLastPurchase == null) return CustomerSegment.NEW;
        if (daysSinceLastPurchase >= inactiveDays) return CustomerSegment.INACTIVE;
        if (daysSinceLastPurchase >= atRiskDays) return CustomerSegment.AT_RISK;
        return purchases <= newMaxPurchases ? CustomerSegment.NEW : CustomerSegment.RECURRING;
    }
}
