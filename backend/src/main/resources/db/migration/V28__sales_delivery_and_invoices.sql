-- V28: Método de entrega, ciclo de preparación/despacho, novedad de cancelación y facturas de venta

ALTER TABLE sales_orders
    ADD COLUMN delivery_method  VARCHAR(10) NOT NULL DEFAULT 'PICKUP',
    ADD COLUMN delivery_address TEXT,
    ADD COLUMN cancel_reason    TEXT;

-- El estado CONFIRMED del MVP inicial pasa a EN PREPARACIÓN en el nuevo ciclo
UPDATE sales_orders SET status = 'PREPARING' WHERE status = 'CONFIRMED';

-- invoice_number_seq ya existe (V11, cuentas por pagar): la de ventas usa nombre propio
CREATE SEQUENCE sales_invoice_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE sales_invoices (
    id             UUID          PRIMARY KEY,
    invoice_number VARCHAR(20)   NOT NULL UNIQUE,
    sales_order_id UUID          NOT NULL REFERENCES sales_orders(id),
    status         VARCHAR(20)   NOT NULL,
    total          NUMERIC(14,4) NOT NULL,
    issued_at      TIMESTAMPTZ   NOT NULL,
    paid_at        TIMESTAMPTZ,
    cancel_reason  TEXT,
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_sales_invoices_status ON sales_invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_invoices_order  ON sales_invoices(sales_order_id);
