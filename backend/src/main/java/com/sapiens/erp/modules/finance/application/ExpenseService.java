package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.ExpenseRequest;
import com.sapiens.erp.modules.finance.api.dto.ExpenseResponse;
import com.sapiens.erp.modules.finance.domain.*;
import com.sapiens.erp.modules.finance.domain.exception.ExpenseAlreadyReconciledException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final FinancialAccountRepository accountRepository;
    private final FinancialMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listAll() {
        return expenseRepository.findAllActive().stream()
                .map(ExpenseResponse::from)
                .toList();
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest req) {
        FinancialAccount account = findActiveAccount(req.financialAccountId());

        Expense expense = Expense.create(
                req.category(), req.amount(), req.expenseDate(), req.description(), account);
        expenseRepository.save(expense);

        String concept = "Gasto operativo [" + req.category().name() + "]: " + req.description();
        FinancialMovement movement = FinancialMovement.createExpense(
                account, req.amount(), concept, "GASTO", expense.getId());
        movementRepository.save(movement);
        accountRepository.save(account);

        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse update(UUID id, ExpenseRequest req) {
        Expense expense = findActiveExpense(id);

        if (expense.isReconciled()) throw new ExpenseAlreadyReconciledException();

        BigDecimal diff = req.amount().subtract(expense.getAmount());
        if (diff.signum() != 0) {
            FinancialAccount account = findActiveAccount(expense.getFinancialAccount().getId());
            String concept = "Ajuste gasto [" + req.category().name() + "]: " + req.description();
            FinancialMovement adjustment = diff.signum() > 0
                    ? FinancialMovement.createExpense(account, diff, concept, "AJUSTE_GASTO", expense.getId())
                    : FinancialMovement.createIncome(account, diff.negate(), concept, "AJUSTE_GASTO", expense.getId());
            movementRepository.save(adjustment);
            accountRepository.save(account);
        }

        expense.updateDetails(req.category(), req.amount(), req.expenseDate(), req.description());
        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(UUID id) {
        Expense expense = findActiveExpense(id);

        if (expense.isReconciled()) throw new ExpenseAlreadyReconciledException();

        FinancialAccount account = findActiveAccount(expense.getFinancialAccount().getId());
        String concept = "Reversión gasto [" + expense.getCategory().name() + "]: " + expense.getDescription();
        FinancialMovement reversal = FinancialMovement.createIncome(
                account, expense.getAmount(), concept, "REVERSIÓN_GASTO", expense.getId());
        movementRepository.save(reversal);
        accountRepository.save(account);

        expense.softDelete();
        expenseRepository.save(expense);
    }

    private Expense findActiveExpense(UUID id) {
        return expenseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Gasto no encontrado: " + id));
    }

    private FinancialAccount findActiveAccount(UUID accountId) {
        FinancialAccount account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Cuenta financiera no encontrada: " + accountId));
        if (account.getStatus() != FinancialAccountStatus.ACTIVE) {
            throw new IllegalArgumentException("La cuenta financiera no está activa");
        }
        return account;
    }
}
