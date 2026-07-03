-- V27: Módulo de Ventas MVP (REQ-VEN-001) — clientes, pedidos, líneas y enlaces públicos

CREATE SEQUENCE so_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE customers (
    id           UUID          PRIMARY KEY,
    name         VARCHAR(150)  NOT NULL,
    email        VARCHAR(150),
    phone        VARCHAR(50),
    is_anonymous BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ   NOT NULL,
    updated_at   TIMESTAMPTZ   NOT NULL,
    deleted_at   TIMESTAMPTZ
);

-- Enlaces públicos de pedido: generados y administrados por la empresa
CREATE TABLE sales_order_links (
    id         UUID         PRIMARY KEY,
    token      VARCHAR(64)  NOT NULL UNIQUE,
    label      VARCHAR(100),
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE sales_orders (
    id           UUID          PRIMARY KEY,
    order_number VARCHAR(20)   NOT NULL UNIQUE,
    customer_id  UUID          REFERENCES customers(id),
    channel      VARCHAR(10)   NOT NULL,
    status       VARCHAR(20)   NOT NULL,
    created_by   VARCHAR(150),
    link_id      UUID          REFERENCES sales_order_links(id),
    notes        TEXT,
    created_at   TIMESTAMPTZ   NOT NULL,
    updated_at   TIMESTAMPTZ   NOT NULL,
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE sales_order_lines (
    id             UUID          PRIMARY KEY,
    sales_order_id UUID          NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id     UUID          NOT NULL REFERENCES products(id),
    product_name   VARCHAR(100)  NOT NULL,
    quantity       NUMERIC(14,4) NOT NULL,
    unit_price     NUMERIC(14,4) NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_sales_orders_status   ON sales_orders(status)  WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_order_lines_order ON sales_order_lines(sales_order_id);
