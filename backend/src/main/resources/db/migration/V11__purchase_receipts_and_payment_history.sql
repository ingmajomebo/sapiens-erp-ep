-- V11: reception per-line quantities + invoice number + payment history

-- Sequence for invoice numbers (FAC-000001)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- ── Reception header: one per purchase order ─────────────────────────────────
CREATE TABLE purchase_order_receipts (
    id                  UUID            PRIMARY KEY,
    purchase_order_id   UUID            NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_receipt_purchase_order
    ON purchase_order_receipts (purchase_order_id)
    WHERE deleted_at IS NULL;

-- ── Reception lines: one per PO line ─────────────────────────────────────────
CREATE TABLE purchase_order_receipt_lines (
    id                      UUID            PRIMARY KEY,
    receipt_id              UUID            NOT NULL REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
    purchase_order_line_id  UUID            NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT,
    product_id              UUID            NOT NULL REFERENCES products(id),
    quantity_ordered        NUMERIC(14,4)   NOT NULL,
    quantity_received       NUMERIC(14,4)   NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost               NUMERIC(14,4)   NOT NULL,
    tax_rate                NUMERIC(5,2)    NOT NULL DEFAULT 0,
    discount                NUMERIC(5,2)    NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipt_lines_receipt ON purchase_order_receipt_lines (receipt_id);

-- ── Extend accounts_payable with invoice number and receipt reference ─────────
ALTER TABLE accounts_payable
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES purchase_order_receipts(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ap_invoice_number
    ON accounts_payable (invoice_number)
    WHERE invoice_number IS NOT NULL AND deleted_at IS NULL;

-- ── Payment history ───────────────────────────────────────────────────────────
CREATE TABLE supplier_payments (
    id                  UUID            PRIMARY KEY,
    accounts_payable_id UUID            NOT NULL REFERENCES accounts_payable(id) ON DELETE RESTRICT,
    payment_date        DATE            NOT NULL,
    amount              NUMERIC(14,4)   NOT NULL CHECK (amount > 0),
    payment_method      VARCHAR(50),
    bank_account        VARCHAR(100),
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_payments_ap ON supplier_payments (accounts_payable_id);
