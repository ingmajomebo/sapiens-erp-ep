-- V42: Add is_default to warehouses, TRANSFER movement type, and location columns on inventory_movements.

-- 1. is_default flag on warehouses
ALTER TABLE warehouses ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE warehouses
SET is_default = TRUE
WHERE id = (SELECT id FROM warehouses WHERE deleted_at IS NULL ORDER BY name LIMIT 1);

-- 2. Widen the movement_type check to allow TRANSFER
ALTER TABLE inventory_movements DROP CONSTRAINT inventory_movements_movement_type_check;
ALTER TABLE inventory_movements
    ADD CONSTRAINT inventory_movements_movement_type_check
        CHECK (movement_type = ANY(ARRAY[
            'ENTRY','EXIT','WASTE','POSITIVE_ADJUSTMENT','NEGATIVE_ADJUSTMENT','TRANSFER'
        ]));

-- 3. Location columns on inventory_movements
ALTER TABLE inventory_movements
    ADD COLUMN from_location_id UUID REFERENCES warehouses(id),
    ADD COLUMN to_location_id   UUID REFERENCES warehouses(id);

-- 4. Backfill ENTRY movements: to_location from lot's warehouse (via movement_lots → lots)
UPDATE inventory_movements im
SET to_location_id = subq.warehouse_id
FROM (
    SELECT DISTINCT ON (ml.movement_id) ml.movement_id, l.warehouse_id
    FROM movement_lots ml
    JOIN lots l ON l.id = ml.lot_id
    WHERE l.warehouse_id IS NOT NULL
    ORDER BY ml.movement_id, l.received_at ASC
) subq
WHERE subq.movement_id = im.id
  AND im.movement_type = 'ENTRY'
  AND im.to_location_id IS NULL;

-- 5. Backfill EXIT/WASTE/NEGATIVE_ADJUSTMENT: from_location from consumed lots
UPDATE inventory_movements im
SET from_location_id = subq.warehouse_id
FROM (
    SELECT DISTINCT ON (ml.movement_id) ml.movement_id, l.warehouse_id
    FROM movement_lots ml
    JOIN lots l ON l.id = ml.lot_id
    WHERE l.warehouse_id IS NOT NULL
    ORDER BY ml.movement_id, l.received_at ASC
) subq
WHERE subq.movement_id = im.id
  AND im.movement_type IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT')
  AND im.from_location_id IS NULL;

-- 6. Indexes
CREATE INDEX idx_inv_movements_from_location ON inventory_movements(product_id, from_location_id);
CREATE INDEX idx_inv_movements_to_location   ON inventory_movements(product_id, to_location_id);
