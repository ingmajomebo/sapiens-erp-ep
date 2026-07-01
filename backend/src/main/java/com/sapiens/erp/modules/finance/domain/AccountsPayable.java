package com.sapiens.erp.modules.finance.domain;

import com.sapiens.erp.modules.procurement.domain.PurchaseOrder;
import com.sapiens.erp.modules.procurement.domain.PurchaseReceipt;
import com.sapiens.erp.modules.procurement.domain.Supplier;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "accounts_payable")
@Getter
@Setter
@NoArgsConstructor
public class AccountsPayable extends AuditableEntity {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false, unique = true)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 4)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private AccountsPayableStatus status = AccountsPayableStatus.PENDING;

    @Column(name = "invoice_number", length = 20)
    private String invoiceNumber;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private PurchaseReceipt receipt;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static AccountsPayable createFromReceipt(PurchaseReceipt receipt, String invoiceNumber, LocalDate dueDate) {
        AccountsPayable ap = new AccountsPayable();
        ap.id = UUID.randomUUID();
        ap.purchaseOrder = receipt.getPurchaseOrder();
        ap.receipt = receipt;
        ap.supplier = receipt.getPurchaseOrder().getSupplier();
        ap.invoiceNumber = invoiceNumber;
        ap.totalAmount = receipt.totalReceived();
        ap.paidAmount = BigDecimal.ZERO;
        ap.status = AccountsPayableStatus.PENDING;
        ap.dueDate = dueDate;
        return ap;
    }

    public BigDecimal pendingAmount() {
        return totalAmount.subtract(paidAmount);
    }

    public void registerPayment(BigDecimal amount) {
        this.paidAmount = this.paidAmount.add(amount);
        if (this.paidAmount.compareTo(this.totalAmount) >= 0) {
            this.paidAmount = this.totalAmount;
            this.status = AccountsPayableStatus.PAID;
        } else {
            this.status = AccountsPayableStatus.PARTIALLY_PAID;
        }
    }
}
