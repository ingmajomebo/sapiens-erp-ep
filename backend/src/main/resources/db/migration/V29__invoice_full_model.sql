-- V29: Facturación completa — borrador, vencimiento, líneas con IVA, pagos parciales,
-- historial de estados, notas crédito y campos preparados para DIAN

ALTER TABLE sales_invoices
    ADD COLUMN customer_id      UUID          REFERENCES customers(id),
    ADD COLUMN due_date         DATE,
    ADD COLUMN payment_form     VARCHAR(10)   NOT NULL DEFAULT 'CASH',
    ADD COLUMN credit_term_days INT           NOT NULL DEFAULT 0,
    ADD COLUMN payment_method   VARCHAR(15),
    ADD COLUMN subtotal         NUMERIC(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN total_discounts  NUMERIC(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN total_taxes      NUMERIC(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN notes            TEXT,
    -- Facturación electrónica DIAN (sin lógica todavía)
    ADD COLUMN cufe             VARCHAR(100),
    ADD COLUMN qr_data          TEXT,
    ADD COLUMN dian_resolution  VARCHAR(100),
    ADD COLUMN dian_range       VARCHAR(100);

-- Los borradores aún no tienen fecha de emisión
ALTER TABLE sales_invoices ALTER COLUMN issued_at DROP NOT NULL;

-- Migración de datos históricos: vencimiento = emisión, subtotal = total, cliente desde el pedido
UPDATE sales_invoices i
SET due_date    = i.issued_at::date,
    subtotal    = i.total,
    customer_id = (SELECT o.customer_id FROM sales_orders o WHERE o.id = i.sales_order_id);

-- Líneas de factura (snapshot con descuento e IVA por línea, tarifas 0/5/19)
CREATE TABLE sales_invoice_lines (
    id           UUID          PRIMARY KEY,
    invoice_id   UUID          NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id   UUID          REFERENCES products(id),
    description  VARCHAR(255)  NOT NULL,
    quantity     NUMERIC(14,4) NOT NULL,
    unit_price   NUMERIC(14,4) NOT NULL,
    discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
    tax_rate     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    line_total   NUMERIC(14,4) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL,
    updated_at   TIMESTAMPTZ   NOT NULL,
    deleted_at   TIMESTAMPTZ
);

-- Backfill: líneas de las facturas existentes desde su pedido (IVA 0, sin descuento)
INSERT INTO sales_invoice_lines (id, invoice_id, product_id, description, quantity, unit_price,
                                 discount_pct, tax_rate, line_total, created_at, updated_at)
SELECT gen_random_uuid(), i.id, sol.product_id, sol.product_name, sol.quantity, sol.unit_price,
       0, 0, sol.quantity * sol.unit_price, NOW(), NOW()
FROM sales_invoices i
JOIN sales_order_lines sol ON sol.sales_order_id = i.sales_order_id AND sol.deleted_at IS NULL;

-- Pagos parciales
CREATE TABLE sales_invoice_payments (
    id             UUID          PRIMARY KEY,
    invoice_id     UUID          NOT NULL REFERENCES sales_invoices(id),
    amount         NUMERIC(14,4) NOT NULL,
    payment_method VARCHAR(15)   NOT NULL,
    paid_on        DATE          NOT NULL,
    reference      VARCHAR(100),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL,
    deleted_at     TIMESTAMPTZ
);

-- Historial de cambios de estado (auditoría)
CREATE TABLE sales_invoice_history (
    id          UUID         PRIMARY KEY,
    invoice_id  UUID         NOT NULL REFERENCES sales_invoices(id),
    from_status VARCHAR(20),
    to_status   VARCHAR(20)  NOT NULL,
    reason      TEXT,
    changed_by  VARCHAR(150),
    changed_at  TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    deleted_at  TIMESTAMPTZ
);

-- Migrar la novedad de cancelación existente al historial
INSERT INTO sales_invoice_history (id, invoice_id, from_status, to_status, reason, changed_by,
                                   changed_at, created_at, updated_at)
SELECT gen_random_uuid(), id, 'ISSUED', 'CANCELLED', cancel_reason, NULL, updated_at, NOW(), NOW()
FROM sales_invoices
WHERE status = 'CANCELLED' AND cancel_reason IS NOT NULL;

-- Notas crédito (corrección contable de cancelaciones de facturas emitidas/pagadas)
CREATE SEQUENCE credit_note_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE credit_notes (
    id          UUID          PRIMARY KEY,
    note_number VARCHAR(20)   NOT NULL UNIQUE,
    invoice_id  UUID          NOT NULL REFERENCES sales_invoices(id),
    reason      TEXT          NOT NULL,
    total       NUMERIC(14,4) NOT NULL,
    issued_at   TIMESTAMPTZ   NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL,
    updated_at  TIMESTAMPTZ   NOT NULL,
    deleted_at  TIMESTAMPTZ
);

-- Índices para los filtros
CREATE INDEX idx_sales_invoices_due_date  ON sales_invoices(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_invoices_customer  ON sales_invoices(customer_id);
CREATE INDEX idx_invoice_lines_invoice    ON sales_invoice_lines(invoice_id);
CREATE INDEX idx_invoice_payments_invoice ON sales_invoice_payments(invoice_id);
CREATE INDEX idx_invoice_history_invoice  ON sales_invoice_history(invoice_id);
CREATE INDEX idx_credit_notes_invoice     ON credit_notes(invoice_id);
