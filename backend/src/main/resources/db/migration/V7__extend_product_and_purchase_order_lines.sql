-- V7: Extend products with new fields + add per-line discount to purchase_order_lines

-- 1. Expand unit_of_measure allowed values on products
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_of_measure_check;
ALTER TABLE products ADD CONSTRAINT products_unit_of_measure_check
    CHECK (unit_of_measure IN ('KG', 'LB', 'UNIT', 'PACKAGE', 'LITER'));

-- 2. New columns on products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sku               VARCHAR(50),
    ADD COLUMN IF NOT EXISTS barcode           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS product_type      VARCHAR(30)
                                               CHECK (product_type IN ('CONSUMER_GOOD','RAW_MATERIAL','INTERNAL_SUPPLY','SERVICE_ASSOCIATED')),
    ADD COLUMN IF NOT EXISTS purchase_cost     NUMERIC(14,4),
    ADD COLUMN IF NOT EXISTS sale_price        NUMERIC(14,4),
    ADD COLUMN IF NOT EXISTS inventory_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS default_warehouse VARCHAR(100),
    ADD COLUMN IF NOT EXISTS status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                                               CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
    ADD COLUMN IF NOT EXISTS image_url         TEXT;

-- Unique index on SKU (only when sku is set and product is not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku_active
    ON products (LOWER(sku))
    WHERE sku IS NOT NULL AND deleted_at IS NULL;

-- 3. Per-line discount on purchase order lines (percentage 0-100)
ALTER TABLE purchase_order_lines
    ADD COLUMN IF NOT EXISTS discount NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount >= 0 AND discount <= 100);
