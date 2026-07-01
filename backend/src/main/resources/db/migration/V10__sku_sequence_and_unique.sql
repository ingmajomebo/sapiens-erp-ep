-- SKU auto-generation sequence
CREATE SEQUENCE IF NOT EXISTS product_sku_seq
    START WITH 1
    INCREMENT BY 1
    NO CYCLE;

-- Partial unique index: only enforces uniqueness among active (non-deleted) products with a non-null SKU
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku_active
    ON products (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
