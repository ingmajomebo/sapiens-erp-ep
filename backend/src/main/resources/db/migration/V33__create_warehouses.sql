-- Warehouses: almacenes / cámaras de frío con control de capacidad

CREATE TABLE warehouses (
    id            UUID          PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    capacity      NUMERIC(10,3),               -- capacidad máxima, en la unidad abajo
    capacity_unit VARCHAR(10)   NOT NULL DEFAULT 'kg',
    description   TEXT,
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at    TIMESTAMP,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_warehouses_name_active
    ON warehouses (LOWER(name))
    WHERE deleted_at IS NULL;

-- Seed: warehouse names that already exist as strings in products.default_warehouse
INSERT INTO warehouses (id, name, capacity, capacity_unit, description)
VALUES
  (gen_random_uuid(), 'Bodega principal',      NULL,    'kg', 'Almacén seco general'),
  (gen_random_uuid(), 'Nevera principal',       500.000, 'kg', 'Cámara de refrigeración principal'),
  (gen_random_uuid(), 'Nevera de exhibición',   80.000,  'kg', 'Vitrina refrigerada de ventas'),
  (gen_random_uuid(), 'Congelador',             300.000, 'kg', 'Cámara de congelación -18°C'),
  (gen_random_uuid(), 'Punto de venta',         NULL,    'kg', 'Área de despacho y venta')
;

-- Link products to the warehouse entity that matches their existing string
ALTER TABLE products ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

UPDATE products p
SET warehouse_id = w.id
FROM warehouses w
WHERE LOWER(p.default_warehouse) = LOWER(w.name)
  AND p.deleted_at IS NULL;

CREATE INDEX idx_products_warehouse_id ON products (warehouse_id);
