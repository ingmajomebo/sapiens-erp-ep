package com.sapiens.erp.modules.sales;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.sales.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

@DisplayName("SalesInvoice — totales, impuestos y máquina de estados")
class SalesInvoiceLifecycleTest {

    private SalesOrder order;
    private SalesInvoice invoice;

    @BeforeEach
    void setUp() {
        Customer customer = Customer.create("Restaurante Prueba", null, null, false);
        order = SalesOrder.create("SO-000001", customer, SalesChannel.ADMIN,
                "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
        invoice = SalesInvoice.draft("FV-000001", order, null);
    }

    private SalesInvoiceLine line(double qty, double price, double discountPct, double taxRate) {
        Product product = Product.create("Salmón", null, null, BigDecimal.ZERO, null);
        return SalesInvoiceLine.create(product, "Salmón", BigDecimal.valueOf(qty),
                BigDecimal.valueOf(price), BigDecimal.valueOf(discountPct), BigDecimal.valueOf(taxRate));
    }

    @Nested
    @DisplayName("cálculo de totales e impuestos")
    class Totals {

        @Test
        @DisplayName("línea con descuento e IVA 19: base = bruto − descuento; total = base + IVA")
        void lineWithDiscountAndTax() {
            SalesInvoiceLine l = line(2, 10000, 10, 19);
            // bruto 20.000 − 10% = 18.000 base; IVA 19% = 3.420; total 21.420
            assertThat(l.gross()).isEqualByComparingTo("20000");
            assertThat(l.discountAmount()).isEqualByComparingTo("2000");
            assertThat(l.taxableBase()).isEqualByComparingTo("18000");
            assertThat(l.taxAmount()).isEqualByComparingTo("3420");
            assertThat(l.computeTotal()).isEqualByComparingTo("21420");
        }

        @Test
        @DisplayName("la factura suma subtotal, descuentos e impuestos discriminados")
        void invoiceAggregatesLines() {
            invoice.addLine(line(1, 10000, 0, 0));    // exento
            invoice.addLine(line(1, 20000, 0, 19));   // IVA 3.800
            invoice.addLine(line(1, 10000, 50, 5));   // base 5.000, IVA 250
            invoice.recomputeTotals();

            assertThat(invoice.getSubtotal()).isEqualByComparingTo("40000");
            assertThat(invoice.getTotalDiscounts()).isEqualByComparingTo("5000");
            assertThat(invoice.getTotalTaxes()).isEqualByComparingTo("4050");
            assertThat(invoice.getTotal()).isEqualByComparingTo("39050");
        }
    }

    @Nested
    @DisplayName("máquina de estados")
    class StateMachine {

        @Test
        @DisplayName("el flujo nace en BORRADOR y solo un borrador puede emitirse")
        void draftThenEmit() {
            assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.DRAFT);
            assertThat(invoice.getIssuedAt()).isNull();

            invoice.emit(PaymentForm.CREDIT, 30, InvoicePaymentMethod.TRANSFER);
            assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.ISSUED);
            assertThat(invoice.getDueDate()).isEqualTo(LocalDate.now().plusDays(30));

            assertThatThrownBy(() -> invoice.emit(PaymentForm.CASH, 0, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("borrador");
        }

        @Test
        @DisplayName("contado vence el mismo día aunque se pidan días de crédito")
        void cashDueToday() {
            invoice.emit(PaymentForm.CASH, 30, InvoicePaymentMethod.CASH);
            assertThat(invoice.getCreditTermDays()).isZero();
            assertThat(invoice.getDueDate()).isEqualTo(LocalDate.now());
        }

        @Test
        @DisplayName("pagos: parcial → PAGO_PARCIAL; suma ≥ total → PAGADA")
        void paymentProgress() {
            invoice.addLine(line(1, 10000, 0, 0));
            invoice.recomputeTotals();
            invoice.emit(PaymentForm.CASH, 0, InvoicePaymentMethod.CASH);

            invoice.applyPaymentProgress(BigDecimal.valueOf(4000));
            assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.PARTIALLY_PAID);

            invoice.applyPaymentProgress(BigDecimal.valueOf(10000));
            assertThat(invoice.getStatus()).isEqualTo(SalesInvoiceStatus.PAID);
            assertThat(invoice.getPaidAt()).isNotNull();
        }

        @Test
        @DisplayName("un borrador no admite pagos")
        void draftRejectsPayments() {
            assertThatThrownBy(() -> invoice.applyPaymentProgress(BigDecimal.ONE))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("VENCIDA es derivado: emitida con vencimiento pasado")
        void overdueIsDerived() {
            invoice.emit(PaymentForm.CREDIT, 15, null);
            assertThat(invoice.isOverdue()).isFalse();

            invoice.setDueDate(LocalDate.now().minusDays(1));
            assertThat(invoice.isOverdue()).isTrue();

            invoice.setStatus(SalesInvoiceStatus.PAID);
            assertThat(invoice.isOverdue()).isFalse();
        }

        @Test
        @DisplayName("cancelar dos veces se rechaza")
        void doubleCancelRejected() {
            invoice.cancel("motivo");
            assertThatThrownBy(() -> invoice.cancel("otra vez"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
