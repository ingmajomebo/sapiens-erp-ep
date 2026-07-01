-- Catalog module: categories and products

CREATE TABLE categories (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_categories_name_active
    ON categories (LOWER(name))
    WHERE deleted_at IS NULL;

CREATE TABLE products (
    id              UUID          PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    category_id     UUID          REFERENCES categories(id) ON DELETE RESTRICT,
    unit_of_measure VARCHAR(10)   NOT NULL CHECK (unit_of_measure IN ('KG', 'UNIT')),
    minimum_stock   NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    description     TEXT,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_products_name_active
    ON products (LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_products_category_id ON products (category_id);
