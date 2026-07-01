-- V8: Finance module — accounts payable (cuentas por pagar)

CREATE TABLE accounts_payable (
    id                  UUID            PRIMARY KEY,
    purchase_order_id   UUID            NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    supplier_id         UUID            NOT NULL REFERENCES suppliers(id)       ON DELETE RESTRICT,
    total_amount        NUMERIC(14,4)   NOT NULL CHECK (total_amount >= 0),
    paid_amount         NUMERIC(14,4)   NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                        CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','CANCELLED')),
    due_date            DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_ap_purchase_order
    ON accounts_payable (purchase_order_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_ap_supplier   ON accounts_payable (supplier_id);
CREATE INDEX idx_ap_status     ON accounts_payable (status) WHERE deleted_at IS NULL;
