package com.sapiens.erp.modules.finance.domain;

import com.sapiens.erp.modules.finance.api.dto.PaymentRequest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "supplier_payments")
@Getter
@Setter
@NoArgsConstructor
public class SupplierPayment {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accounts_payable_id", nullable = false)
    private AccountsPayable accountsPayable;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "payment_origin", length = 100)
    private String paymentOrigin;

    @Column(name = "supplier_account", length = 200)
    private String supplierAccount;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "bank_account", length = 100)
    private String bankAccount;

    @Column(name = "financial_account_id")
    private UUID financialAccountId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static SupplierPayment create(AccountsPayable ap, PaymentRequest req) {
        SupplierPayment p = new SupplierPayment();
        p.id = UUID.randomUUID();
        p.accountsPayable = ap;
        p.paymentDate = req.paymentDate() != null ? req.paymentDate() : LocalDate.now();
        p.amount = req.amount();
        p.paymentMethod = req.paymentMethod();
        p.paymentOrigin = req.paymentOrigin();
        p.supplierAccount = req.supplierAccount();
        p.referenceNumber = req.referenceNumber();
        p.financialAccountId = req.financialAccountId();
        p.notes = req.notes();
        p.createdAt = Instant.now();
        return p;
    }
}
