-- V44: Subcategorías de catálogo. Una subcategoría siempre pertenece a una
-- categoría; el producto puede tener subcategoría o no (campo opcional).

CREATE TABLE subcategories (
    id          UUID         PRIMARY KEY,
    category_id UUID         NOT NULL REFERENCES categories(id),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- El nombre es único dentro de su categoría, no globalmente:
-- 'Entero' puede existir bajo Pescados y bajo Mariscos.
CREATE UNIQUE INDEX uq_subcategories_name_active
    ON subcategories (category_id, LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_subcategories_category ON subcategories (category_id);

-- Opcional en productos: NULL = producto sin subcategoría
ALTER TABLE products ADD COLUMN subcategory_id UUID REFERENCES subcategories(id);

CREATE INDEX idx_products_subcategory ON products (subcategory_id);
