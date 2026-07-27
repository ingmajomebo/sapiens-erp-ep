package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.api.dto.SelectiveResetRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DataResetService {

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public void selectiveReset(SelectiveResetRequest req) {
        boolean deleteCxc = req.accountsReceivable() || req.invoices() || req.salesOrders();
        boolean deleteInvoices = req.invoices() || req.salesOrders();

        if (deleteCxc) {
            em.createNativeQuery("DELETE FROM receipt_applications").executeUpdate();
            em.createNativeQuery("DELETE FROM payment_receipts").executeUpdate();
            em.createNativeQuery("DELETE FROM accounts_receivable").executeUpdate();
        }
        if (deleteInvoices) {
            em.createNativeQuery("DELETE FROM credit_notes").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_invoice_payments").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_invoice_history").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_invoice_lines").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_invoices").executeUpdate();
        }
        if (req.salesOrders()) {
            em.createNativeQuery("DELETE FROM sales_order_links").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_order_lines").executeUpdate();
            em.createNativeQuery("DELETE FROM sales_orders").executeUpdate();
        }
        if (req.expenses()) {
            em.createNativeQuery(
                "DELETE FROM financial_movements WHERE related_document IN ('GASTO', 'AJUSTE_GASTO', 'REVERSIÓN_GASTO')"
            ).executeUpdate();
            em.createNativeQuery("DELETE FROM expenses").executeUpdate();
        }
    }

    @Transactional
    public void resetBusinessData() {
        // Truncate in dependency order — leaf tables first, then root business entities.
        // CASCADE handles any remaining FK references not listed here.
        em.createNativeQuery("""
            TRUNCATE TABLE
                cash_sessions,
                receipt_applications,
                payment_receipts,
                accounts_receivable,
                credit_notes,
                sales_invoice_payments,
                sales_invoice_history,
                sales_invoice_lines,
                sales_invoices,
                sales_order_links,
                sales_order_lines,
                sales_orders,
                supplier_payments,
                accounts_payable,
                purchase_order_receipt_lines,
                purchase_order_receipts,
                purchase_order_lines,
                purchase_orders,
                movement_lots,
                inventory_movements,
                lots,
                expenses,
                financial_movements,
                products,
                customers,
                suppliers
            CASCADE
        """).executeUpdate();

        // Reset all financial account balances to zero
        em.createNativeQuery(
            "UPDATE financial_accounts SET current_balance = 0, updated_at = NOW()"
        ).executeUpdate();

        // Clear active sessions so users must re-login (optional but clean)
        em.createNativeQuery("DELETE FROM refresh_tokens").executeUpdate();
    }
}
