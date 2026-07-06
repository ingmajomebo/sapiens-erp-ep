package com.sapiens.erp.modules.finance.api.dto;

import com.sapiens.erp.modules.finance.domain.AccountsReceivable;
import com.sapiens.erp.modules.finance.domain.AgingBucket;
import com.sapiens.erp.modules.finance.domain.PaymentReceipt;
import com.sapiens.erp.modules.finance.domain.ReceiptPaymentMethod;
import com.sapiens.erp.modules.finance.domain.ReceiptStatus;
import com.sapiens.erp.modules.finance.domain.ReceivableStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ReceivableDtos {

    private ReceivableDtos() {}

    // ── Requests ──────────────────────────────────────────────────────────────

    public record ApplicationRequest(
            @NotNull UUID accountsReceivableId,
            @NotNull @Positive BigDecimal amount
    ) {}

    public record PaymentReceiptRequest(
            @NotNull UUID customerId,
            @NotNull @Positive BigDecimal amount,
            @NotNull ReceiptPaymentMethod paymentMethod,
            @NotNull UUID financialAccountId,
            @Size(max = 100) String reference,
            @NotEmpty @Valid List<ApplicationRequest> applications
    ) {}

    public record VoidRequest(
            @NotNull @Size(min = 3, max = 255) String reason
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    public record ReceivableResponse(
            UUID id, UUID customerId, String customerName,
            UUID invoiceId, String invoiceNumber,
            BigDecimal total, BigDecimal paid, BigDecimal pending,
            LocalDate dueDate, ReceivableStatus status,
            AgingBucket agingBucket, long daysOverdue
    ) {
        public static ReceivableResponse from(AccountsReceivable ar, String customerName, LocalDate today) {
            boolean open = ar.isOpen();
            return new ReceivableResponse(ar.getId(), ar.getCustomerId(), customerName,
                    ar.getInvoiceId(), ar.getInvoiceNumber(),
                    ar.getTotal(), ar.getPaid(), ar.getPending(),
                    ar.getDueDate(), ar.getStatus(),
                    open ? ar.agingBucket(today) : AgingBucket.CURRENT,
                    open ? Math.max(ar.daysOverdue(today), 0) : 0);
        }
    }

    /** Recibo aplicado a una CxC (visto desde la CxC). */
    public record AppliedReceiptResponse(
            UUID receiptId, String number, BigDecimal appliedAmount, BigDecimal receiptAmount,
            ReceiptPaymentMethod paymentMethod, String reference,
            ReceiptStatus status, String voidReason, Instant receiptDate
    ) {}

    public record ReceivableDetailResponse(
            ReceivableResponse receivable,
            List<AppliedReceiptResponse> payments
    ) {}

    public record ReceiptApplicationResponse(
            UUID accountsReceivableId, String invoiceNumber, BigDecimal amount
    ) {}

    public record PaymentReceiptResponse(
            UUID id, String number, UUID customerId, String customerName,
            BigDecimal amount, ReceiptPaymentMethod paymentMethod,
            UUID financialAccountId, String reference,
            ReceiptStatus status, String voidReason, Instant voidedAt, String voidedByEmail,
            Instant receiptDate,
            List<ReceiptApplicationResponse> applications
    ) {
        public static PaymentReceiptResponse from(PaymentReceipt r, String customerName,
                                                  String voidedByEmail,
                                                  List<ReceiptApplicationResponse> applications) {
            return new PaymentReceiptResponse(r.getId(), r.getNumber(), r.getCustomerId(), customerName,
                    r.getAmount(), r.getPaymentMethod(),
                    r.getFinancialAccountId(), r.getReference(),
                    r.getStatus(), r.getVoidReason(), r.getVoidedAt(), voidedByEmail,
                    r.getReceiptDate(), applications);
        }
    }

    // ── Aging ─────────────────────────────────────────────────────────────────

    public record AgingRow(
            UUID customerId, String customerName,
            BigDecimal current, BigDecimal d1To30, BigDecimal d31To60, BigDecimal d60Plus,
            BigDecimal total
    ) {}

    public record AgingReportResponse(
            BigDecimal totalPending,
            BigDecimal totalOverdue,
            long openCount,
            Map<AgingBucket, BigDecimal> totalsByBucket,
            List<AgingRow> rows
    ) {}
}
