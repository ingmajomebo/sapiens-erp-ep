package com.sapiens.erp.modules.finance.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "expenses")
@Getter
@NoArgsConstructor
public class Expense extends AuditableEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ExpenseCategory category;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExpenseStatus status = ExpenseStatus.REGISTERED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "financial_account_id", nullable = false)
    private FinancialAccount financialAccount;

    public static Expense create(ExpenseCategory category, BigDecimal amount,
                                 LocalDate expenseDate, String description,
                                 FinancialAccount account) {
        Expense e = new Expense();
        e.id = UUID.randomUUID();
        e.category = category;
        e.amount = amount;
        e.expenseDate = expenseDate;
        e.description = description;
        e.status = ExpenseStatus.REGISTERED;
        e.financialAccount = account;
        return e;
    }

    public boolean isReconciled() {
        return status == ExpenseStatus.RECONCILED;
    }

    public void updateDetails(ExpenseCategory category, BigDecimal amount,
                              LocalDate expenseDate, String description) {
        this.category = category;
        this.amount = amount;
        this.expenseDate = expenseDate;
        this.description = description;
    }

    public void reconcile() {
        this.status = ExpenseStatus.RECONCILED;
    }
}
