-- V31: Cuentas por Cobrar — CxC por factura, recibos de caja (RC-NNNNNN) y aplicaciones.
-- Los recibos son documentos de auditoría: sin deleted_at, se anulan con status = VOIDED
-- (misma excepción del ADR-005 que aplica a movimientos de inventario).

CREATE SEQUENCE payment_receipt_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE accounts_receivable (
    id             UUID           PRIMARY KEY,
    customer_id    UUID           NOT NULL REFERENCES customers(id),
    invoice_id     UUID           NOT NULL UNIQUE REFERENCES sales_invoices(id),
    invoice_number VARCHAR(20)    NOT NULL,   -- denormalizado, patrón de accounts_payable
    total       NUMERIC(14,4)  NOT NULL,
    paid        NUMERIC(14,4)  NOT NULL DEFAULT 0,
    pending     NUMERIC(14,4)  NOT NULL,
    due_date    DATE           NOT NULL,
    status      VARCHAR(20)    NOT NULL,   -- PENDING | PARTIALLY_PAID | PAID | CANCELLED
    created_at  TIMESTAMPTZ    NOT NULL,
    updated_at  TIMESTAMPTZ    NOT NULL
);

CREATE TABLE payment_receipts (
    id                   UUID           PRIMARY KEY,
    number               VARCHAR(20)    NOT NULL UNIQUE,   -- RC-NNNNNN (secuencia BD)
    customer_id          UUID           NOT NULL REFERENCES customers(id),
    amount               NUMERIC(14,4)  NOT NULL CHECK (amount > 0),
    payment_method       VARCHAR(20)    NOT NULL,          -- CASH | CARD | TRANSFER | OTHER
    financial_account_id UUID           REFERENCES financial_accounts(id),  -- NULL en recibos legados/flujo simple
    reference            VARCHAR(100),
    status               VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | VOIDED
    void_reason          VARCHAR(255),
    voided_by            UUID,
    voided_at            TIMESTAMPTZ,
    user_id              UUID,                              -- NULL solo en recibos migrados
    receipt_date         TIMESTAMPTZ    NOT NULL,
    created_at           TIMESTAMPTZ    NOT NULL
);

CREATE TABLE receipt_applications (
    id                     UUID           PRIMARY KEY,
    payment_receipt_id     UUID           NOT NULL REFERENCES payment_receipts(id),
    accounts_receivable_id UUID           NOT NULL REFERENCES accounts_receivable(id),
    amount                 NUMERIC(14,4)  NOT NULL CHECK (amount > 0)
);

CREATE INDEX idx_ar_customer_status ON accounts_receivable (customer_id, status);
CREATE INDEX idx_ar_due_date ON accounts_receivable (due_date);
CREATE INDEX idx_receipt_apps_ar ON receipt_applications (accounts_receivable_id);
CREATE INDEX idx_receipt_apps_receipt ON receipt_applications (payment_receipt_id);
CREATE INDEX idx_receipts_customer ON payment_receipts (customer_id, status);

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- 1 CxC por factura emitida/pagada existente (paid = suma de pagos activos).
INSERT INTO accounts_receivable (id, customer_id, invoice_id, invoice_number, total, paid, pending, due_date, status, created_at, updated_at)
SELECT gen_random_uuid(),
       i.customer_id,
       i.id,
       i.invoice_number,
       i.total,
       COALESCE(p.paid, 0),
       i.total - COALESCE(p.paid, 0),
       COALESCE(i.due_date, CURRENT_DATE),
       CASE WHEN COALESCE(p.paid, 0) = 0 THEN 'PENDING'
            WHEN COALESCE(p.paid, 0) >= i.total THEN 'PAID'
            ELSE 'PARTIALLY_PAID' END,
       NOW(), NOW()
FROM sales_invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS paid
    FROM sales_invoice_payments
    WHERE deleted_at IS NULL
    GROUP BY invoice_id
) p ON p.invoice_id = i.id
WHERE i.deleted_at IS NULL
  AND i.customer_id IS NOT NULL
  AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID');

-- Un recibo legado por cada pago existente, para que las CxC se deriven
-- exclusivamente de recibos ACTIVE desde el inicio. El id del recibo reutiliza
-- el UUID del pago origen para conservar el vínculo pago→recibo en el siguiente insert.
INSERT INTO payment_receipts (id, number, customer_id, amount, payment_method, financial_account_id,
                              reference, status, user_id, receipt_date, created_at)
SELECT sp.id,
       'RC-' || LPAD(nextval('payment_receipt_number_seq')::text, 6, '0'),
       ar.customer_id,
       sp.amount,
       sp.payment_method,
       NULL,
       COALESCE(sp.reference, 'Pago migrado de facturación'),
       'ACTIVE',
       NULL,
       sp.paid_on::timestamptz,
       NOW()
FROM sales_invoice_payments sp
JOIN accounts_receivable ar ON ar.invoice_id = sp.invoice_id
WHERE sp.deleted_at IS NULL
ORDER BY sp.paid_on, sp.created_at;

-- Aplicación 1:1 del recibo legado contra la CxC de su factura.
INSERT INTO receipt_applications (id, payment_receipt_id, accounts_receivable_id, amount)
SELECT gen_random_uuid(), sp.id, ar.id, sp.amount
FROM sales_invoice_payments sp
JOIN accounts_receivable ar ON ar.invoice_id = sp.invoice_id
WHERE sp.deleted_at IS NULL;
