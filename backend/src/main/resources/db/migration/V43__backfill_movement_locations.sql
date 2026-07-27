-- V43: Backfill to_location_id and from_location_id on existing inventory_movements.
-- The no_update_inventory_movements rule blocks UPDATE, so we drop it temporarily.

-- 1. Drop immutability rules temporarily
DROP RULE no_update_inventory_movements ON inventory_movements;

-- 2. Backfill ENTRY movements: to_location_id from lots.warehouse_id
--    Match via the OC number embedded in the notes field ("Recepción OC PO-xxxx")
UPDATE inventory_movements im
SET to_location_id = l.warehouse_id
FROM lots l
WHERE im.movement_type = 'ENTRY'
  AND im.to_location_id IS NULL
  AND l.warehouse_id IS NOT NULL
  AND im.notes = 'Recepción OC ' || l.invoice_number
  AND im.product_id = l.product_id;

-- 3. Backfill EXIT/WASTE/NEGATIVE_ADJUSTMENT: from_location_id from consumed lots
UPDATE inventory_movements im
SET from_location_id = (
    SELECT l.warehouse_id
    FROM movement_lots ml
    JOIN lots l ON l.id = ml.lot_id
    WHERE ml.movement_id = im.id
      AND l.warehouse_id IS NOT NULL
    LIMIT 1
)
WHERE im.movement_type IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT')
  AND im.from_location_id IS NULL
  AND EXISTS (
      SELECT 1 FROM movement_lots ml JOIN lots l ON l.id = ml.lot_id
      WHERE ml.movement_id = im.id AND l.warehouse_id IS NOT NULL
  );

-- 4. Restore immutability rule
CREATE RULE no_update_inventory_movements AS
    ON UPDATE TO inventory_movements DO INSTEAD NOTHING;
