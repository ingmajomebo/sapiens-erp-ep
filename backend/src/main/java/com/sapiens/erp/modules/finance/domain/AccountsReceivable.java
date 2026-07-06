package com.sapiens.erp.modules.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Cuenta por cobrar: 1 por factura de venta emitida. La factura es inmutable;
 * el saldo se mueve solo aplicando recibos de caja (ACTIVE). Sin soft delete:
 * si la factura se anula, la CxC pasa a CANCELLED (fuera de cartera).
 */
@Entity
@Table(name = "accounts_receivable")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor
public class AccountsReceivable {

    @Id
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "invoice_id", nullable = false, unique = true)
    private UUID invoiceId;

    @Column(name = "invoice_number", nullable = false, length = 20)
    private String invoiceNumber;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal total;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal paid;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal pending;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReceivableStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static AccountsReceivable open(UUID customerId, UUID invoiceId, String invoiceNumber,
                                          BigDecimal total, LocalDate dueDate) {
        AccountsReceivable ar = new AccountsReceivable();
        ar.id = UUID.randomUUID();
        ar.customerId = customerId;
        ar.invoiceId = invoiceId;
        ar.invoiceNumber = invoiceNumber;
        ar.total = total;
        ar.paid = BigDecimal.ZERO;
        ar.pending = total;
        ar.dueDate = dueDate != null ? dueDate : LocalDate.now();
        ar.status = ReceivableStatus.PENDING;
        return ar;
    }

    /** Aplica un abono. El estado se deriva, nunca se asigna a mano. */
    public void applyPayment(BigDecimal amount) {
        recompute(paid.add(amount));
    }

    /** Revierte un abono (anulación de recibo). */
    public void revertPayment(BigDecimal amount) {
        recompute(paid.subtract(amount).max(BigDecimal.ZERO));
    }

    public void cancelForVoidedInvoice() {
        this.status = ReceivableStatus.CANCELLED;
    }

    public boolean isOpen() {
        return status == ReceivableStatus.PENDING || status == ReceivableStatus.PARTIALLY_PAID;
    }

    /** Días de mora sobre el vencimiento original: un abono no reinicia el vencimiento. */
    public long daysOverdue(LocalDate today) {
        return java.time.temporal.ChronoUnit.DAYS.between(dueDate, today);
    }

    public AgingBucket agingBucket(LocalDate today) {
        long days = daysOverdue(today);
        if (days <= 0) return AgingBucket.CURRENT;
        if (days <= 30) return AgingBucket.D1_30;
        if (days <= 60) return AgingBucket.D31_60;
        return AgingBucket.D60_PLUS;
    }

    private void recompute(BigDecimal newPaid) {
        if (status == ReceivableStatus.CANCELLED) {
            throw new IllegalArgumentException("La CxC está cancelada (factura anulada)");
        }
        this.paid = newPaid;
        this.pending = total.subtract(newPaid);
        if (newPaid.signum() == 0) this.status = ReceivableStatus.PENDING;
        else if (newPaid.compareTo(total) >= 0) this.status = ReceivableStatus.PAID;
        else this.status = ReceivableStatus.PARTIALLY_PAID;
    }
}
