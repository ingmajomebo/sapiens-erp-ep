CREATE SEQUENCE po_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE purchase_orders (
    id               UUID          PRIMARY KEY,
    order_number     VARCHAR(20)   NOT NULL UNIQUE,
    supplier_id      UUID          NOT NULL REFERENCES suppliers(id),
    status           VARCHAR(20)   NOT NULL,
    expected_delivery DATE,
    warehouse        VARCHAR(100),
    payment_terms    VARCHAR(50),
    notes            TEXT,
    discount         NUMERIC(14,4) NOT NULL DEFAULT 0,
    paid_amount      NUMERIC(14,4) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL,
    deleted_at       TIMESTAMPTZ
);

CREATE TABLE purchase_order_lines (
    id                  UUID          PRIMARY KEY,
    purchase_order_id   UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          UUID          NOT NULL REFERENCES products(id),
    quantity            NUMERIC(14,4) NOT NULL,
    unit_cost           NUMERIC(14,4) NOT NULL,
    tax_rate            NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
    created_at          TIMESTAMPTZ   NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL,
    deleted_at          TIMESTAMPTZ
);
