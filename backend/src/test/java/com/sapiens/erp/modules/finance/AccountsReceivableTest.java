package com.sapiens.erp.modules.finance;

import com.sapiens.erp.modules.finance.domain.AccountsReceivable;
import com.sapiens.erp.modules.finance.domain.AgingBucket;
import com.sapiens.erp.modules.finance.domain.PaymentReceipt;
import com.sapiens.erp.modules.finance.domain.ReceiptPaymentMethod;
import com.sapiens.erp.modules.finance.domain.ReceivableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Invariantes de Cuentas por Cobrar: estados derivados, antigüedad y anulación. */
class AccountsReceivableTest {

    private AccountsReceivable open(BigDecimal total, LocalDate dueDate) {
        return AccountsReceivable.open(UUID.randomUUID(), UUID.randomUUID(), "FV-000001", total, dueDate);
    }

    @Nested
    @DisplayName("Estados derivados")
    class DerivedStatus {

        @Test
        @DisplayName("Nace PENDING con pending = total")
        void bornPending() {
            AccountsReceivable ar = open(new BigDecimal("45000"), LocalDate.now().plusDays(30));
            assertEquals(ReceivableStatus.PENDING, ar.getStatus());
            assertEquals(new BigDecimal("45000"), ar.getPending());
        }

        @Test
        @DisplayName("Abono parcial → PARTIALLY_PAID, pending = total − paid")
        void partialPayment() {
            AccountsReceivable ar = open(new BigDecimal("45000"), LocalDate.now().plusDays(30));
            ar.applyPayment(new BigDecimal("20000"));
            assertEquals(ReceivableStatus.PARTIALLY_PAID, ar.getStatus());
            assertEquals(new BigDecimal("20000"), ar.getPaid());
            assertEquals(new BigDecimal("25000"), ar.getPending());
        }

        @Test
        @DisplayName("Abono del saldo restante → PAID, cartera en 0")
        void fullPayment() {
            AccountsReceivable ar = open(new BigDecimal("45000"), LocalDate.now().plusDays(30));
            ar.applyPayment(new BigDecimal("20000"));
            ar.applyPayment(new BigDecimal("25000"));
            assertEquals(ReceivableStatus.PAID, ar.getStatus());
            assertEquals(0, ar.getPending().signum());
        }

        @Test
        @DisplayName("Reversión (recibo anulado) re-deriva el estado")
        void revertRederives() {
            AccountsReceivable ar = open(new BigDecimal("45000"), LocalDate.now().plusDays(30));
            ar.applyPayment(new BigDecimal("45000"));
            assertEquals(ReceivableStatus.PAID, ar.getStatus());
            ar.revertPayment(new BigDecimal("45000"));
            assertEquals(ReceivableStatus.PENDING, ar.getStatus());
            assertEquals(new BigDecimal("45000"), ar.getPending());
        }

        @Test
        @DisplayName("CxC cancelada (factura anulada) no admite movimientos")
        void cancelledRejectsMovements() {
            AccountsReceivable ar = open(new BigDecimal("45000"), LocalDate.now().plusDays(30));
            ar.cancelForVoidedInvoice();
            assertEquals(ReceivableStatus.CANCELLED, ar.getStatus());
            assertThrows(IllegalArgumentException.class, () -> ar.applyPayment(new BigDecimal("1000")));
        }
    }

    @Nested
    @DisplayName("Antigüedad (sobre due_date original)")
    class Aging {

        @Test
        @DisplayName("No vencida → CURRENT")
        void currentBucket() {
            AccountsReceivable ar = open(new BigDecimal("100"), LocalDate.now().plusDays(5));
            assertEquals(AgingBucket.CURRENT, ar.agingBucket(LocalDate.now()));
        }

        @Test
        @DisplayName("Límites de buckets: 1, 30, 31, 60, 61 días")
        void bucketBoundaries() {
            LocalDate today = LocalDate.now();
            assertEquals(AgingBucket.CURRENT, open(BigDecimal.TEN, today).agingBucket(today));
            assertEquals(AgingBucket.D1_30, open(BigDecimal.TEN, today.minusDays(1)).agingBucket(today));
            assertEquals(AgingBucket.D1_30, open(BigDecimal.TEN, today.minusDays(30)).agingBucket(today));
            assertEquals(AgingBucket.D31_60, open(BigDecimal.TEN, today.minusDays(31)).agingBucket(today));
            assertEquals(AgingBucket.D31_60, open(BigDecimal.TEN, today.minusDays(60)).agingBucket(today));
            assertEquals(AgingBucket.D60_PLUS, open(BigDecimal.TEN, today.minusDays(61)).agingBucket(today));
        }

        @Test
        @DisplayName("Un abono no reinicia el vencimiento: el saldo mantiene la due_date original")
        void paymentDoesNotResetDueDate() {
            LocalDate due = LocalDate.now().plusDays(5);
            AccountsReceivable ar = open(new BigDecimal("45000"), due);
            ar.applyPayment(new BigDecimal("20000"));
            assertEquals(due, ar.getDueDate());
            assertEquals(AgingBucket.CURRENT, ar.agingBucket(LocalDate.now()));
            assertEquals(new BigDecimal("25000"), ar.getPending());
        }
    }

    @Nested
    @DisplayName("Recibos de caja")
    class Receipts {

        @Test
        @DisplayName("Anular exige estado ACTIVE y deja rastro completo")
        void voidLeavesAuditTrail() {
            PaymentReceipt r = PaymentReceipt.create("RC-000001", UUID.randomUUID(),
                    new BigDecimal("20000"), ReceiptPaymentMethod.TRANSFER, null, null, UUID.randomUUID());
            UUID voider = UUID.randomUUID();
            r.voidReceipt("Error de digitación", voider);
            assertEquals("Error de digitación", r.getVoidReason());
            assertEquals(voider, r.getVoidedBy());
            assertNotNull(r.getVoidedAt());
            assertThrows(IllegalArgumentException.class, () -> r.voidReceipt("otra vez", voider));
        }
    }
}
