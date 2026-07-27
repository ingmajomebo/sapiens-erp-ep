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

    @Transactional
    public FinancialAccountResponse update(UUID id, FinancialAccountRequest req) {
        FinancialAccount account = accountRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        account.setName(req.name().trim());
        account.setAccountType(req.accountType());
        account.setNotes(req.notes());
        return FinancialAccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public void delete(UUID id) {
        FinancialAccount account = accountRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        account.setDeletedAt(java.time.Instant.now());
        accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public List<FinancialMovementResponse> getRecentMovements(int limit) {
        return movementRepository.findRecentMovements(Math.min(limit, 200)).stream()
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

    /**
     * Espejo de registerExpense: usado por Cuentas por Cobrar al aplicar un recibo de caja.
     * Aumenta el saldo de la cuenta y registra el movimiento INCOME.
     */
    @Transactional
    public void registerIncome(UUID accountId, BigDecimal amount, String concept,
                               String relatedDocument, UUID relatedEntityId) {
        FinancialAccount account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
                .filter(a -> a.getStatus() == FinancialAccountStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta financiera no encontrada o inactiva: " + accountId));
        FinancialMovement movement = FinancialMovement.createIncome(
                account, amount, concept, relatedDocument, relatedEntityId);
        movementRepository.save(movement);
        accountRepository.save(account);
    }
}
