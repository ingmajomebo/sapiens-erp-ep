package com.sapiens.erp.modules.finance;

import com.sapiens.erp.modules.finance.api.dto.ExpenseRequest;
import com.sapiens.erp.modules.finance.api.dto.ExpenseResponse;
import com.sapiens.erp.modules.finance.application.ExpenseService;
import com.sapiens.erp.modules.finance.domain.*;
import com.sapiens.erp.modules.finance.domain.exception.ExpenseAlreadyReconciledException;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExpenseService")
class ExpenseServiceTest {

    @Mock ExpenseRepository expenseRepository;
    @Mock FinancialAccountRepository accountRepository;
    @Mock FinancialMovementRepository movementRepository;
    @InjectMocks ExpenseService service;

    private UUID accountId;
    private FinancialAccount account;

    @BeforeEach
    void setUp() {
        account = FinancialAccount.create("Caja principal", FinancialAccountType.CASH,
                new BigDecimal("10000.00"), null);
        accountId = account.getId();  // must match account.getId(), not a separate random UUID
        lenient().when(accountRepository.findByIdAndDeletedAtIsNull(accountId))
                .thenReturn(Optional.of(account));
        lenient().when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(movementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(expenseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ExpenseRequest request(BigDecimal amount) {
        return new ExpenseRequest(
                ExpenseCategory.SUPPLIES, amount,
                LocalDate.now(), "Test description", accountId);
    }

    private Expense buildRegisteredExpense(BigDecimal amount) {
        return Expense.create(ExpenseCategory.SUPPLIES, amount, LocalDate.now(), "Test", account);
    }

    // ── create() ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("create()")
    class Create {

        @Test
        @DisplayName("decrements account balance by expense amount")
        void decrementsBalance() {
            BigDecimal initialBalance = account.getCurrentBalance();
            BigDecimal expenseAmount = new BigDecimal("300.00");

            service.create(request(expenseAmount));

            assertThat(account.getCurrentBalance())
                    .isEqualByComparingTo(initialBalance.subtract(expenseAmount));
        }

        @Test
        @DisplayName("saves expense, movement and account")
        void savesAllEntities() {
            service.create(request(new BigDecimal("100.00")));

            verify(expenseRepository).save(any(Expense.class));
            verify(movementRepository).save(any(FinancialMovement.class));
            verify(accountRepository).save(account);
        }

        @Test
        @DisplayName("created expense has status REGISTERED")
        void expenseIsRegistered() {
            ExpenseResponse response = service.create(request(new BigDecimal("200.00")));

            assertThat(response.status()).isEqualTo("REGISTERED");
        }

        @Test
        @DisplayName("throws EntityNotFoundException when account not found")
        void throwsWhenAccountNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(accountRepository.findByIdAndDeletedAtIsNull(unknownId)).thenReturn(Optional.empty());

            ExpenseRequest req = new ExpenseRequest(
                    ExpenseCategory.OTHER, new BigDecimal("100.00"),
                    LocalDate.now(), "desc", unknownId);

            assertThatThrownBy(() -> service.create(req))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("throws when account is INACTIVE")
        void throwsWhenAccountInactive() {
            account.setStatus(FinancialAccountStatus.INACTIVE);

            assertThatThrownBy(() -> service.create(request(new BigDecimal("100.00"))))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("activa");
        }
    }

    // ── update() ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("update()")
    class Update {

        private UUID expenseId;
        private Expense expense;

        @BeforeEach
        void setUpExpense() {
            expenseId = UUID.randomUUID();
            expense = buildRegisteredExpense(new BigDecimal("500.00"));
            // Simulate that the account already had the original expense applied
            account.applyExpense(new BigDecimal("500.00"));
            lenient().when(expenseRepository.findByIdAndDeletedAtIsNull(expenseId))
                    .thenReturn(Optional.of(expense));
        }

        @Test
        @DisplayName("increasing amount applies additional expense movement")
        void increasingAmountCreatesExpenseMovement() {
            BigDecimal balanceBefore = account.getCurrentBalance();

            service.update(expenseId, request(new BigDecimal("800.00")));

            // Difference 300 should be debited
            assertThat(account.getCurrentBalance())
                    .isEqualByComparingTo(balanceBefore.subtract(new BigDecimal("300.00")));
            verify(movementRepository).save(argThat(m ->
                    ((FinancialMovement) m).getMovementType() == FinancialMovementType.EXPENSE));
        }

        @Test
        @DisplayName("decreasing amount applies income reversal movement")
        void decreasingAmountCreatesIncomeMovement() {
            BigDecimal balanceBefore = account.getCurrentBalance();

            service.update(expenseId, request(new BigDecimal("200.00")));

            // Difference 300 should be credited back
            assertThat(account.getCurrentBalance())
                    .isEqualByComparingTo(balanceBefore.add(new BigDecimal("300.00")));
            verify(movementRepository).save(argThat(m ->
                    ((FinancialMovement) m).getMovementType() == FinancialMovementType.INCOME));
        }

        @Test
        @DisplayName("same amount generates no financial movement")
        void sameAmountNoMovement() {
            service.update(expenseId, request(new BigDecimal("500.00")));

            verifyNoInteractions(movementRepository);
        }

        @Test
        @DisplayName("throws ExpenseAlreadyReconciledException when reconciled")
        void throwsWhenReconciled() {
            expense.reconcile();

            assertThatThrownBy(() -> service.update(expenseId, request(new BigDecimal("200.00"))))
                    .isInstanceOf(ExpenseAlreadyReconciledException.class)
                    .hasMessageContaining("conciliado");
        }

        @Test
        @DisplayName("throws EntityNotFoundException when expense not found")
        void throwsWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(expenseRepository.findByIdAndDeletedAtIsNull(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(unknownId, request(new BigDecimal("100.00"))))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ── delete() ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("delete()")
    class Delete {

        private UUID expenseId;
        private Expense expense;

        @BeforeEach
        void setUpExpense() {
            expenseId = UUID.randomUUID();
            expense = buildRegisteredExpense(new BigDecimal("400.00"));
            account.applyExpense(new BigDecimal("400.00"));
            lenient().when(expenseRepository.findByIdAndDeletedAtIsNull(expenseId))
                    .thenReturn(Optional.of(expense));
        }

        @Test
        @DisplayName("reverts full amount back to account")
        void revertsFullAmount() {
            BigDecimal balanceBefore = account.getCurrentBalance();

            service.delete(expenseId);

            assertThat(account.getCurrentBalance())
                    .isEqualByComparingTo(balanceBefore.add(new BigDecimal("400.00")));
        }

        @Test
        @DisplayName("creates INCOME reversal movement")
        void createsIncomeMovement() {
            service.delete(expenseId);

            verify(movementRepository).save(argThat(m ->
                    ((FinancialMovement) m).getMovementType() == FinancialMovementType.INCOME));
        }

        @Test
        @DisplayName("soft-deletes the expense")
        void softDeletesExpense() {
            service.delete(expenseId);

            assertThat(expense.getDeletedAt()).isNotNull();
            verify(expenseRepository).save(expense);
        }

        @Test
        @DisplayName("throws ExpenseAlreadyReconciledException when reconciled")
        void throwsWhenReconciled() {
            expense.reconcile();

            assertThatThrownBy(() -> service.delete(expenseId))
                    .isInstanceOf(ExpenseAlreadyReconciledException.class);
        }

        @Test
        @DisplayName("throws EntityNotFoundException when expense not found")
        void throwsWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(expenseRepository.findByIdAndDeletedAtIsNull(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(unknownId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ── listAll() ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("listAll()")
    class ListAll {

        @Test
        @DisplayName("returns mapped responses from repository")
        void returnsActiveExpenses() {
            Expense e1 = buildRegisteredExpense(new BigDecimal("100.00"));
            Expense e2 = buildRegisteredExpense(new BigDecimal("200.00"));
            when(expenseRepository.findAllActive()).thenReturn(List.of(e1, e2));

            List<ExpenseResponse> result = service.listAll();

            assertThat(result).hasSize(2);
            assertThat(result.get(0).amount()).isEqualByComparingTo("100.00");
            assertThat(result.get(1).amount()).isEqualByComparingTo("200.00");
        }

        @Test
        @DisplayName("returns empty list when no expenses")
        void returnsEmptyList() {
            when(expenseRepository.findAllActive()).thenReturn(List.of());

            assertThat(service.listAll()).isEmpty();
        }
    }
}
