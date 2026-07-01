-- V9: Add average_cost and purchase_cost_last to products;
--     add cost audit columns to inventory_movements.

-- Products: last purchase cost (auto-updated on each received purchase)
-- and weighted average cost (recalculated on every positive movement)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS purchase_cost_last NUMERIC(14,4),
    ADD COLUMN IF NOT EXISTS average_cost       NUMERIC(14,4);

-- inventory_movements: audit trail for cost changes per movement
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS previous_average_cost NUMERIC(14,4),
    ADD COLUMN IF NOT EXISTS new_average_cost      NUMERIC(14,4);
