package com.sapiens.erp.modules.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "financial_movements")
@Getter
@Setter
@NoArgsConstructor
public class FinancialMovement {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "financial_account_id", nullable = false)
    private FinancialAccount financialAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 20)
    private FinancialMovementType movementType;

    @Column(nullable = false, length = 255)
    private String concept;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 14, scale = 4)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 4)
    private BigDecimal balanceAfter;

    @Column(name = "related_document", length = 100)
    private String relatedDocument;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Column(name = "movement_date", nullable = false)
    private LocalDate movementDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static FinancialMovement createExpense(
            FinancialAccount account,
            BigDecimal amount,
            String concept,
            String relatedDocument,
            UUID relatedEntityId) {
        BigDecimal balanceBefore = account.getCurrentBalance();
        account.applyExpense(amount);
        FinancialMovement m = new FinancialMovement();
        m.id = UUID.randomUUID();
        m.financialAccount = account;
        m.movementType = FinancialMovementType.EXPENSE;
        m.concept = concept;
        m.amount = amount;
        m.balanceBefore = balanceBefore;
        m.balanceAfter = account.getCurrentBalance();
        m.relatedDocument = relatedDocument;
        m.relatedEntityId = relatedEntityId;
        m.movementDate = LocalDate.now();
        m.createdAt = Instant.now();
        return m;
    }

    public static FinancialMovement createIncome(
            FinancialAccount account,
            BigDecimal amount,
            String concept,
            String relatedDocument,
            UUID relatedEntityId) {
        BigDecimal balanceBefore = account.getCurrentBalance();
        account.applyIncome(amount);
        FinancialMovement m = new FinancialMovement();
        m.id = UUID.randomUUID();
        m.financialAccount = account;
        m.movementType = FinancialMovementType.INCOME;
        m.concept = concept;
        m.amount = amount;
        m.balanceBefore = balanceBefore;
        m.balanceAfter = account.getCurrentBalance();
        m.relatedDocument = relatedDocument;
        m.relatedEntityId = relatedEntityId;
        m.movementDate = LocalDate.now();
        m.createdAt = Instant.now();
        return m;
    }
}
