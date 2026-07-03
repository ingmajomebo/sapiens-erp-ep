package com.sapiens.erp.modules.sales.api.dto;

import com.sapiens.erp.modules.sales.application.CustomerMetricsService.Metrics;
import com.sapiens.erp.modules.sales.domain.Customer;
import com.sapiens.erp.modules.sales.domain.CustomerSegment;
import com.sapiens.erp.modules.sales.domain.DocumentType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public final class CustomerDtos {

    private CustomerDtos() {}

    // ── Requests ──────────────────────────────────────────────────────────────

    public record UpsertRequest(
            @NotBlank @Size(max = 150) String name,
            DocumentType documentType,
            @Size(max = 30) String documentNumber,
            @Size(max = 200) String legalName,
            @Email @Size(max = 150) String email,
            @Size(max = 50) String phone,
            @Size(max = 200) String address,
            @Size(max = 100) String city,
            @Min(0) Integer defaultPaymentTermDays,
            String notes
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    public record CustomerListItem(
            UUID id, String name, String legalName,
            DocumentType documentType, String documentNumber,
            String email, String phone, String city,
            Integer defaultPaymentTermDays, boolean anonymous, Instant createdAt,
            long totalPurchases, BigDecimal totalInvoiced, BigDecimal avgTicket,
            Instant firstPurchaseAt, Instant lastPurchaseAt,
            Long daysSinceLastPurchase, Long avgFrequencyDays,
            BigDecimal pendingBalance, CustomerSegment segment
    ) {
        public static CustomerListItem from(Customer c, Metrics m) {
            return new CustomerListItem(c.getId(), c.getName(), c.getLegalName(),
                    c.getDocumentType(), c.getDocumentNumber(),
                    c.getEmail(), c.getPhone(), c.getCity(),
                    c.getDefaultPaymentTermDays(), c.isAnonymous(), c.getCreatedAt(),
                    m.totalPurchases(), m.totalInvoiced(), m.avgTicket(),
                    m.firstPurchaseAt(), m.lastPurchaseAt(),
                    m.daysSinceLastPurchase(), m.avgFrequencyDays(),
                    m.pendingBalance(), m.segment());
        }
    }

    public record CustomerDetailResponse(
            CustomerListItem customer,
            String address, String notes,
            java.util.List<PurchaseHistoryItem> purchases,
            java.util.List<MonthlyTotal> monthlyTotals
    ) {}

    /** Compra del historial: pedido + su factura activa si existe. */
    public record PurchaseHistoryItem(
            UUID orderId, String orderNumber, String orderStatus, Instant orderDate,
            BigDecimal total,
            UUID invoiceId, String invoiceNumber, String invoiceStatus
    ) {}

    /** Total facturado por mes (para la gráfica de 12 meses). */
    public record MonthlyTotal(String month, BigDecimal total) {}

    public record SegmentSummary(
            long total,
            Map<CustomerSegment, Long> bySegment,
            BigDecimal totalPendingBalance
    ) {}
}
