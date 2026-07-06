package com.sapiens.erp.modules.sales.api.dto;

import com.sapiens.erp.modules.sales.domain.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** DTOs del flujo completo de facturación (borrador, emisión, pagos, historial, NC). */
public final class SalesInvoiceDtos {

    private SalesInvoiceDtos() {}

    // ── Requests ──────────────────────────────────────────────────────────────

    public record EmitRequest(
            PaymentForm paymentForm,
            Integer creditTermDays,
            InvoicePaymentMethod paymentMethod
    ) {}

    public record PaymentRequest(
            @NotNull @DecimalMin(value = "0", inclusive = false,
                    message = "El monto del pago debe ser mayor a cero") BigDecimal amount,
            @NotNull InvoicePaymentMethod paymentMethod,
            LocalDate paidOn,
            String reference,
            String notes,
            UUID financialAccountId   // opcional: cuenta que recibe el dinero (genera recibo de caja con movimiento)
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    public record InvoiceListResponse(
            UUID id,
            String invoiceNumber,
            UUID orderId,
            String orderNumber,
            UUID customerId,
            String customerName,
            SalesInvoiceStatus status,
            boolean overdue,
            PaymentForm paymentForm,
            BigDecimal total,
            BigDecimal paidAmount,
            BigDecimal balance,
            Instant issuedAt,
            LocalDate dueDate,
            Instant paidAt,
            String cancelReason,
            Instant createdAt
    ) {
        public static InvoiceListResponse from(SalesInvoice inv, BigDecimal paidAmount) {
            BigDecimal paid = paidAmount != null ? paidAmount : BigDecimal.ZERO;
            return new InvoiceListResponse(
                    inv.getId(), inv.getInvoiceNumber(),
                    inv.getSalesOrder().getId(), inv.getSalesOrder().getOrderNumber(),
                    inv.getCustomer() != null ? inv.getCustomer().getId() : null,
                    inv.getCustomer() != null ? inv.getCustomer().getName() : "Cliente anónimo",
                    inv.getStatus(), inv.isOverdue(), inv.getPaymentForm(),
                    inv.getTotal(), paid, inv.getTotal().subtract(paid),
                    inv.getIssuedAt(), inv.getDueDate(), inv.getPaidAt(),
                    inv.getCancelReason(), inv.getCreatedAt()
            );
        }
    }

    public record InvoiceLineResponse(
            UUID productId,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discountPct,
            BigDecimal taxRate,
            BigDecimal taxAmount,
            BigDecimal lineTotal
    ) {
        public static InvoiceLineResponse from(SalesInvoiceLine l) {
            return new InvoiceLineResponse(
                    l.getProduct() != null ? l.getProduct().getId() : null,
                    l.getDescription(), l.getQuantity(), l.getUnitPrice(),
                    l.getDiscountPct(), l.getTaxRate(), l.taxAmount(), l.getLineTotal());
        }
    }

    public record PaymentResponse(
            UUID id,
            BigDecimal amount,
            InvoicePaymentMethod paymentMethod,
            LocalDate paidOn,
            String reference,
            String notes
    ) {
        public static PaymentResponse from(SalesInvoicePayment p) {
            return new PaymentResponse(p.getId(), p.getAmount(), p.getPaymentMethod(),
                    p.getPaidOn(), p.getReference(), p.getNotes());
        }
    }

    public record HistoryResponse(
            SalesInvoiceStatus fromStatus,
            SalesInvoiceStatus toStatus,
            String reason,
            String changedBy,
            Instant changedAt
    ) {
        public static HistoryResponse from(SalesInvoiceHistory h) {
            return new HistoryResponse(h.getFromStatus(), h.getToStatus(), h.getReason(),
                    h.getChangedBy(), h.getChangedAt());
        }
    }

    public record CreditNoteResponse(
            UUID id,
            String noteNumber,
            String invoiceNumber,
            String reason,
            BigDecimal total,
            Instant issuedAt
    ) {
        public static CreditNoteResponse from(CreditNote n) {
            return new CreditNoteResponse(n.getId(), n.getNoteNumber(),
                    n.getInvoice().getInvoiceNumber(), n.getReason(), n.getTotal(), n.getIssuedAt());
        }
    }

    /** Detalle completo: cabecera + líneas + impuestos por tarifa + pagos + historial + NC. */
    public record InvoiceDetailResponse(
            InvoiceListResponse header,
            BigDecimal subtotal,
            BigDecimal totalDiscounts,
            BigDecimal totalTaxes,
            Map<String, BigDecimal> taxesByRate,
            int creditTermDays,
            InvoicePaymentMethod paymentMethod,
            String notes,
            String customerEmail,
            String customerPhone,
            List<InvoiceLineResponse> lines,
            List<PaymentResponse> payments,
            List<HistoryResponse> history,
            List<CreditNoteResponse> creditNotes
    ) {}
}
