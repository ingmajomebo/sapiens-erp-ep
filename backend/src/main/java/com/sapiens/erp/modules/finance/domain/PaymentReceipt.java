package com.sapiens.erp.modules.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Recibo de caja RC-NNNNNN. Documento de auditoría: nunca se borra ni se edita,
 * se anula con VOIDED + motivo + usuario + fecha.
 */
@Entity
@Table(name = "payment_receipts")
@Getter
@NoArgsConstructor
public class PaymentReceipt {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String number;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private ReceiptPaymentMethod paymentMethod;

    @Column(name = "financial_account_id")
    private UUID financialAccountId;

    @Column(length = 100)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReceiptStatus status;

    @Column(name = "void_reason", length = 255)
    private String voidReason;

    @Column(name = "voided_by")
    private UUID voidedBy;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "receipt_date", nullable = false)
    private Instant receiptDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL)
    private List<ReceiptApplication> applications = new ArrayList<>();

    public static PaymentReceipt create(String number, UUID customerId, BigDecimal amount,
                                        ReceiptPaymentMethod method, UUID financialAccountId,
                                        String reference, UUID userId) {
        PaymentReceipt r = new PaymentReceipt();
        r.id = UUID.randomUUID();
        r.number = number;
        r.customerId = customerId;
        r.amount = amount;
        r.paymentMethod = method;
        r.financialAccountId = financialAccountId;
        r.reference = reference;
        r.status = ReceiptStatus.ACTIVE;
        r.userId = userId;
        r.receiptDate = Instant.now();
        r.createdAt = Instant.now();
        return r;
    }

    public void addApplication(AccountsReceivable ar, BigDecimal amount) {
        applications.add(ReceiptApplication.create(this, ar, amount));
    }

    public void voidReceipt(String reason, UUID voidedBy) {
        if (status == ReceiptStatus.VOIDED) {
            throw new IllegalArgumentException("El recibo " + number + " ya está anulado");
        }
        this.status = ReceiptStatus.VOIDED;
        this.voidReason = reason;
        this.voidedBy = voidedBy;
        this.voidedAt = Instant.now();
    }
}
