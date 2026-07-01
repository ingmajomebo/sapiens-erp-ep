package com.sapiens.erp.modules.finance.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "financial_accounts")
@Getter
@Setter
@NoArgsConstructor
public class FinancialAccount extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 30)
    private FinancialAccountType accountType;

    @Column(name = "initial_balance", nullable = false, precision = 14, scale = 4)
    private BigDecimal initialBalance = BigDecimal.ZERO;

    @Column(name = "current_balance", nullable = false, precision = 14, scale = 4)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FinancialAccountStatus status = FinancialAccountStatus.ACTIVE;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static FinancialAccount create(String name, FinancialAccountType type, BigDecimal initialBalance, String notes) {
        FinancialAccount a = new FinancialAccount();
        a.id = UUID.randomUUID();
        a.name = name;
        a.accountType = type;
        a.initialBalance = initialBalance != null ? initialBalance : BigDecimal.ZERO;
        a.currentBalance = a.initialBalance;
        a.status = FinancialAccountStatus.ACTIVE;
        a.notes = notes;
        return a;
    }

    public void applyExpense(BigDecimal amount) {
        this.currentBalance = this.currentBalance.subtract(amount);
    }

    public void applyIncome(BigDecimal amount) {
        this.currentBalance = this.currentBalance.add(amount);
    }
}
