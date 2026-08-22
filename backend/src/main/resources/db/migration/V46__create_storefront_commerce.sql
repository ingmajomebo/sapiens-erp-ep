-- V46: Tienda pública de Encanto Pacífico.
--   1. Vitrina: qué productos se publican y cómo se agrupan en presentaciones.
--   2. Seguimiento de pedido sin necesidad de cuenta.
--   3. Cuentas de cliente, separadas de los usuarios del ERP.

-- ── 1. Vitrina ───────────────────────────────────────────────────────────────
-- Tabla aparte de `products` a propósito: la mayoría de productos del ERP
-- (insumos, materia prima) nunca se publican, y no queremos ensuciar la
-- entidad del Core Domain con atributos de mercadeo.
--
-- Cada fila es una PRESENTACIÓN vendible con su propio stock en el ERP:
--   'Pargo rojo · Filete 500 g'  y  'Pargo rojo · Entero 1 kg'
-- son dos productos distintos que la tienda agrupa por `group_slug`.
CREATE TABLE storefront_products (
    product_id        UUID         PRIMARY KEY REFERENCES products(id),
    slug              VARCHAR(120) NOT NULL,
    -- Agrupa las presentaciones de un mismo pescado
    group_slug        VARCHAR(120) NOT NULL,
    group_name        VARCHAR(120) NOT NULL,
    -- Eje 1 del selector. NULL cuando el grupo tiene una sola presentación.
    axis_presentation VARCHAR(60),
    -- Eje 2 del selector. Siempre presente.
    axis_size         VARCHAR(60)  NOT NULL,
    origin            VARCHAR(80),
    description       TEXT,
    conservation      TEXT,
    sort_order        INTEGER      NOT NULL DEFAULT 100,
    published         BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_storefront_products_slug
    ON storefront_products (slug)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_storefront_products_group
    ON storefront_products (group_slug)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_storefront_products_published
    ON storefront_products (published, sort_order)
    WHERE deleted_at IS NULL;

-- ── 2. Seguimiento del pedido ────────────────────────────────────────────────
-- Token opaco para consultar el estado sin autenticarse. Solo lo tienen
-- los pedidos del canal público.
ALTER TABLE sales_orders ADD COLUMN tracking_token VARCHAR(64);

CREATE UNIQUE INDEX uq_sales_orders_tracking_token
    ON sales_orders (tracking_token)
    WHERE tracking_token IS NOT NULL;

-- Datos de entrega que el ERP no guardaba y el despacho necesita
ALTER TABLE sales_orders ADD COLUMN delivery_city VARCHAR(80);
ALTER TABLE sales_orders ADD COLUMN contact_phone VARCHAR(40);
ALTER TABLE sales_orders ADD COLUMN contact_email VARCHAR(160);
ALTER TABLE sales_orders ADD COLUMN shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN payment_method VARCHAR(30);

-- ── 3. Cuentas de cliente ────────────────────────────────────────────────────
-- Deliberadamente separadas de `users`: un cliente de la tienda no es un
-- usuario del ERP y no debe poder autenticarse contra el panel administrativo.
CREATE TABLE storefront_accounts (
    id            UUID         PRIMARY KEY,
    email         VARCHAR(160) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    name          VARCHAR(120) NOT NULL,
    phone         VARCHAR(40),
    -- Vínculo con la entidad comercial del ERP. Se crea al primer pedido.
    customer_id   UUID         REFERENCES customers(id),
    last_login_at TIMESTAMP,
    deleted_at    TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_storefront_accounts_email
    ON storefront_accounts (LOWER(email))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_storefront_accounts_customer
    ON storefront_accounts (customer_id)
    WHERE deleted_at IS NULL;

-- Permite reconocer al cliente que vuelve con el mismo teléfono
CREATE INDEX idx_customers_phone ON customers (phone) WHERE deleted_at IS NULL;
