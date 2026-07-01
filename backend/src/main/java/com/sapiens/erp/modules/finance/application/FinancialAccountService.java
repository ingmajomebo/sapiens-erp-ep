package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.FinancialAccountRequest;
import com.sapiens.erp.modules.finance.api.dto.FinancialAccountResponse;
import com.sapiens.erp.modules.finance.api.dto.FinancialMovementResponse;
import com.sapiens.erp.modules.finance.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FinancialAccountService {

    private final FinancialAccountRepository accountRepository;
    private final FinancialMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public List<FinancialAccountResponse> listAll() {
        return accountRepository.findAllActive().stream()
                .map(FinancialAccountResponse::from)
                .toList();
    }

    @Transactional
    public FinancialAccountResponse create(FinancialAccountRequest req) {
        FinancialAccount account = FinancialAccount.create(
                req.name(),
                req.accountType(),
                req.initialBalance(),
                req.notes()
        );
        return FinancialAccountResponse.from(accountRepository.save(account));
    }

    @Transactional(readOnly = true)
    public List<FinancialMovementResponse> getMovements(UUID accountId) {
        return movementRepository.findByFinancialAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(FinancialMovementResponse::from)
                .toList();
    }

    /**
     * Called internally by AccountsPayableService when a supplier payment is registered.
     * Decreases the account balance and records the movement.
     */
    @Transactional
    public void registerExpense(UUID accountId, BigDecimal amount, String concept,
                                String relatedDocument, UUID relatedEntityId) {
        FinancialAccount account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta financiera no encontrada: " + accountId));
        FinancialMovement movement = FinancialMovement.createExpense(
                account, amount, concept, relatedDocument, relatedEntityId);
        movementRepository.save(movement);
        accountRepository.save(account);
    }
}
