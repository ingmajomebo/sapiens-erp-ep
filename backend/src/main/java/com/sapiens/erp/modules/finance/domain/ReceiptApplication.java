package com.sapiens.erp.modules.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/** Aplicación de un recibo contra una CxC: un recibo puede cubrir varias facturas. */
@Entity
@Table(name = "receipt_applications")
@Getter
@NoArgsConstructor
public class ReceiptApplication {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_receipt_id", nullable = false)
    private PaymentReceipt receipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accounts_receivable_id", nullable = false)
    private AccountsReceivable receivable;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    public static ReceiptApplication create(PaymentReceipt receipt, AccountsReceivable receivable,
                                            BigDecimal amount) {
        ReceiptApplication a = new ReceiptApplication();
        a.id = UUID.randomUUID();
        a.receipt = receipt;
        a.receivable = receivable;
        a.amount = amount;
        return a;
    }
}
