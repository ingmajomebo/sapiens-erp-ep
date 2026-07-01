package com.sapiens.erp.modules.finance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapiens.erp.modules.finance.domain.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Expenses — Integration tests")
class ExpenseIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper mapper;
    @Autowired FinancialAccountRepository accountRepository;
    @Autowired ExpenseRepository expenseRepository;

    private RequestPostProcessor adminUser;
    private UUID accountId;

    // Cuenta Bancaria Principal seeded in V13 with 700 000 balance
    private static final UUID SEEDED_ACCOUNT_ID =
            UUID.fromString("d2b4ae74-41a4-4f1d-a912-20ca028eaef5");

    @BeforeEach
    void setUp() {
        adminUser = user("admin").roles("ADMIN");
        accountId = SEEDED_ACCOUNT_ID;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String body(Object req) throws Exception {
        return mapper.writeValueAsString(req);
    }

    private Map<String, Object> expenseBody(BigDecimal amount, UUID accId) {
        return Map.of(
                "category", "SUPPLIES",
                "amount", amount,
                "expenseDate", LocalDate.now().toString(),
                "description", "Test expense",
                "financialAccountId", accId.toString()
        );
    }

    private UUID createExpense(BigDecimal amount) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/expenses")
                        .with(adminUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(expenseBody(amount, accountId))))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(readField(result, "id"));
    }

    private String readField(MvcResult result, String field) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString()).get(field).asText();
    }

    private BigDecimal currentBalance() {
        return accountRepository.findByIdAndDeletedAtIsNull(accountId).orElseThrow().getCurrentBalance();
    }

    // ── POST /expenses ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /expenses")
    class CreateExpense {

        @Test
        @DisplayName("returns 201 with expense data")
        void returns201() throws Exception {
            mockMvc.perform(post("/api/v1/expenses")
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("1500.00"), accountId))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").isString())
                    .andExpect(jsonPath("$.status").value("REGISTERED"))
                    .andExpect(jsonPath("$.category").value("SUPPLIES"))
                    .andExpect(jsonPath("$.amount").value(1500.0))
                    .andExpect(jsonPath("$.financialAccountName").isString());
        }

        @Test
        @DisplayName("decrements account balance by expense amount")
        void decrementsAccountBalance() throws Exception {
            BigDecimal before = currentBalance();
            BigDecimal expense = new BigDecimal("2000.00");

            createExpense(expense);

            assertThat(currentBalance()).isEqualByComparingTo(before.subtract(expense));
        }

        @Test
        @DisplayName("creates a EXPENSE financial movement")
        void createsFinancialMovement() throws Exception {
            BigDecimal before = currentBalance();
            createExpense(new BigDecimal("500.00"));

            mockMvc.perform(get("/api/v1/financial-accounts/" + accountId + "/movements")
                            .with(adminUser))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].movementType").value("EXPENSE"))
                    .andExpect(jsonPath("$[0].balanceBefore").value(before.doubleValue()))
                    .andExpect(jsonPath("$[0].balanceAfter").value(before.subtract(new BigDecimal("500.00")).doubleValue()));
        }

        @Test
        @DisplayName("returns 400 when amount is zero")
        void rejects400WhenAmountIsZero() throws Exception {
            mockMvc.perform(post("/api/v1/expenses")
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(BigDecimal.ZERO, accountId))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }

        @Test
        @DisplayName("returns 400 when description is blank")
        void rejects400WhenDescriptionBlank() throws Exception {
            var req = Map.of(
                    "category", "SUPPLIES",
                    "amount", "100.00",
                    "expenseDate", LocalDate.now().toString(),
                    "description", "",
                    "financialAccountId", accountId.toString()
            );
            mockMvc.perform(post("/api/v1/expenses")
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(req)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns 404 when financial account does not exist")
        void returns404WhenAccountNotFound() throws Exception {
            mockMvc.perform(post("/api/v1/expenses")
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("100.00"), UUID.randomUUID()))))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("expense appears in GET /expenses list")
        void appearsInList() throws Exception {
            createExpense(new BigDecimal("300.00"));

            mockMvc.perform(get("/api/v1/expenses").with(adminUser))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));
        }
    }

    // ── PUT /expenses/{id} ────────────────────────────────────────────────────

    @Nested
    @DisplayName("PUT /expenses/{id}")
    class UpdateExpense {

        @Test
        @DisplayName("increasing amount debits the difference from account")
        void increasingAmountDebitsBalance() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("500.00"));
            BigDecimal after500 = currentBalance();

            mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("800.00"), accountId))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.amount").value(800.0));

            assertThat(currentBalance()).isEqualByComparingTo(after500.subtract(new BigDecimal("300.00")));
        }

        @Test
        @DisplayName("decreasing amount credits the difference back to account")
        void decreasingAmountCreditsBalance() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("1000.00"));
            BigDecimal after1000 = currentBalance();

            mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("600.00"), accountId))))
                    .andExpect(status().isOk());

            assertThat(currentBalance()).isEqualByComparingTo(after1000.add(new BigDecimal("400.00")));
        }

        @Test
        @DisplayName("same amount does not change account balance")
        void sameAmountKeepsBalance() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("700.00"));
            BigDecimal balanceAfterCreate = currentBalance();

            mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("700.00"), accountId))))
                    .andExpect(status().isOk());

            assertThat(currentBalance()).isEqualByComparingTo(balanceAfterCreate);
        }

        @Test
        @DisplayName("returns 422 when expense is reconciled")
        void returns422WhenReconciled() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("400.00"));

            // Reconcile directly
            Expense expense = expenseRepository.findByIdAndDeletedAtIsNull(expenseId).orElseThrow();
            expense.reconcile();
            expenseRepository.save(expense);

            mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                            .with(adminUser)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body(expenseBody(new BigDecimal("999.00"), accountId))))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.status").value(422))
                    .andExpect(jsonPath("$.error").value("EXPENSE_RECONCILED"));
        }
    }

    // ── DELETE /expenses/{id} ─────────────────────────────────────────────────

    @Nested
    @DisplayName("DELETE /expenses/{id}")
    class DeleteExpense {

        @Test
        @DisplayName("returns 204 and removes from list")
        void returns204AndRemovesFromList() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("200.00"));

            mockMvc.perform(delete("/api/v1/expenses/" + expenseId).with(adminUser))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/api/v1/expenses").with(adminUser))
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("reverts full amount back to account balance")
        void revertsAmountToBalance() throws Exception {
            BigDecimal initial = currentBalance();
            UUID expenseId = createExpense(new BigDecimal("1200.00"));
            BigDecimal afterCreate = currentBalance();
            assertThat(afterCreate).isEqualByComparingTo(initial.subtract(new BigDecimal("1200.00")));

            mockMvc.perform(delete("/api/v1/expenses/" + expenseId).with(adminUser))
                    .andExpect(status().isNoContent());

            assertThat(currentBalance()).isEqualByComparingTo(initial);
        }

        @Test
        @DisplayName("creates INCOME reversal movement on delete")
        void createsReversalMovement() throws Exception {
            createExpense(new BigDecimal("300.00"));
            UUID expenseId = createExpense(new BigDecimal("500.00"));

            mockMvc.perform(delete("/api/v1/expenses/" + expenseId).with(adminUser))
                    .andExpect(status().isNoContent());

            MvcResult movements = mockMvc.perform(
                            get("/api/v1/financial-accounts/" + accountId + "/movements")
                                    .with(adminUser))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode movementList = mapper.readTree(movements.getResponse().getContentAsString());
            boolean hasReversal = false;
            for (JsonNode m : movementList) {
                if ("INCOME".equals(m.get("movementType").asText())
                        && m.get("concept").asText().contains("Reversión")) {
                    hasReversal = true;
                    break;
                }
            }
            assertThat(hasReversal).isTrue();
        }

        @Test
        @DisplayName("returns 422 when expense is reconciled")
        void returns422WhenReconciled() throws Exception {
            UUID expenseId = createExpense(new BigDecimal("400.00"));

            Expense expense = expenseRepository.findByIdAndDeletedAtIsNull(expenseId).orElseThrow();
            expense.reconcile();
            expenseRepository.save(expense);

            mockMvc.perform(delete("/api/v1/expenses/" + expenseId).with(adminUser))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.error").value("EXPENSE_RECONCILED"));
        }

        @Test
        @DisplayName("returns 404 when expense not found")
        void returns404WhenNotFound() throws Exception {
            mockMvc.perform(delete("/api/v1/expenses/" + UUID.randomUUID()).with(adminUser))
                    .andExpect(status().isNotFound());
        }
    }

    // ── GET /expenses ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /expenses")
    class ListExpenses {

        @Test
        @DisplayName("returns only active (non-deleted) expenses")
        void returnsOnlyActive() throws Exception {
            UUID keep = createExpense(new BigDecimal("100.00"));
            UUID toDelete = createExpense(new BigDecimal("200.00"));
            mockMvc.perform(delete("/api/v1/expenses/" + toDelete).with(adminUser));

            mockMvc.perform(get("/api/v1/expenses").with(adminUser))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].id").value(keep.toString()));
        }

        @Test
        @DisplayName("requires authentication — returns 401 without token")
        void requiresAuth() throws Exception {
            mockMvc.perform(get("/api/v1/expenses"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
