-- Inventory module: lots, inventory_movements, movement_lots

CREATE TABLE lots (
    id                UUID          PRIMARY KEY,
    product_id        UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity          NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    purchase_price    NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
    received_at       DATE          NOT NULL,
    expires_at        DATE,
    invoice_number    VARCHAR(50),
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lots_product_received ON lots (product_id, received_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- inventory_movements: append-only, never UPDATE or DELETE
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory_movements (
    id              UUID          PRIMARY KEY,
    product_id      UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type   VARCHAR(30)   NOT NULL
                                  CHECK (movement_type IN ('ENTRY','EXIT','WASTE','POSITIVE_ADJUSTMENT','NEGATIVE_ADJUSTMENT')),
    quantity        NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit_cost       NUMERIC(12,2),
    reason          TEXT,
    notes           TEXT,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements (product_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements (created_at DESC);

-- Protect immutability at DB level
CREATE RULE no_update_inventory_movements AS
    ON UPDATE TO inventory_movements DO INSTEAD NOTHING;

CREATE RULE no_delete_inventory_movements AS
    ON DELETE TO inventory_movements DO INSTEAD NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- movement_lots: which lots were consumed per movement (FIFO tracking)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE movement_lots (
    id            UUID          PRIMARY KEY,
    movement_id   UUID          NOT NULL REFERENCES inventory_movements(id) ON DELETE RESTRICT,
    lot_id        UUID          NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
    quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    UNIQUE (movement_id, lot_id)
);

CREATE INDEX idx_movement_lots_lot_id ON movement_lots (lot_id);
