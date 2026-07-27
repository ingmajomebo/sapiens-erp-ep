-- V41: Vincula lots con warehouses para tracking de stock por almacén.

ALTER TABLE lots
    ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);

-- Backfill: asignar el almacén de la OC a cada lote via invoice_number
UPDATE lots l
SET warehouse_id = po.warehouse_id
FROM purchase_orders po
WHERE l.invoice_number = po.order_number
  AND po.warehouse_id IS NOT NULL;

CREATE INDEX idx_lots_warehouse ON lots(warehouse_id);
