-- V40: Vincula purchase_orders con la tabla warehouses mediante FK real.
-- La columna warehouse (texto) se conserva para compatibilidad de lectura.

ALTER TABLE purchase_orders
    ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);

-- Backfill: vincular órdenes existentes al almacén que coincida por nombre (case-insensitive)
UPDATE purchase_orders po
SET warehouse_id = w.id
FROM warehouses w
WHERE LOWER(po.warehouse) = LOWER(w.name)
  AND po.deleted_at IS NULL;

CREATE INDEX idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);
