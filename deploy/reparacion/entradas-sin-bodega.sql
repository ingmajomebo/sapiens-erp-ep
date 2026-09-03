-- Repara el stock que quedó fuera de toda bodega y por eso no se puede facturar.
--
-- EL PROBLEMA
-- `warehouseId` era opcional al registrar una entrada, así que entró mercancía
-- "a ninguna parte". El stock total decía 10 unidades y el stock por bodega
-- decía 0. La tienda vendía y al cobrar la factura saltaba:
--   422 INSUFFICIENT_STOCK_AT_LOCATION ... Available: 0, requested: 1
--
-- POR QUÉ NO ES UN UPDATE
-- La base bloquea editar movimientos con una regla:
--   CREATE RULE no_update_inventory_movements AS ON UPDATE ... DO INSTEAD NOTHING
-- Un UPDATE aquí no falla: se descarta en silencio. Así que la corrección se
-- hace como debe hacerse en un inventario auditable, con movimientos nuevos:
--
--   ENTRY  10  (sin bodega)          <- se queda: es lo que pasó
--   + AJUSTE +10 -> Bodega principal <- pone el stock donde sí existe
--   + AJUSTE -10 <- sin ubicación    <- retira el fantasma
--   ------------------------------------
--     total 10  ·  en bodega 10
--
-- Los lotes SÍ se actualizan: no son historia, son el estado actual del
-- inventario, y el FIFO por ubicación necesita saber dónde está cada lote.
--
--   docker compose ... exec -T postgres psql -U sapiens -d <bd> < este-archivo
--
-- Idempotente: marca las correcciones por su motivo y no las repite.

BEGIN;

CREATE TEMP TABLE destino ON COMMIT DROP AS
SELECT id FROM warehouses WHERE name = 'Bodega principal' AND deleted_at IS NULL LIMIT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM destino) THEN
        RAISE EXCEPTION 'No existe la bodega "Bodega principal"';
    END IF;
END $$;

-- Las entradas huérfanas que aún no se han corregido
CREATE TEMP TABLE pendientes ON COMMIT DROP AS
SELECT m.id, m.product_id, m.quantity, m.unit_cost
FROM inventory_movements m
WHERE m.movement_type = 'ENTRY'
  AND m.to_location_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM inventory_movements c
      WHERE c.product_id = m.product_id
        AND c.reason = 'Corrección de ubicación: stock ingresado sin bodega'
        AND c.movement_type = 'POSITIVE_ADJUSTMENT'
  );

-- ── 1. Poner el stock en la bodega ───────────────────────────────────────────
INSERT INTO inventory_movements
    (id, product_id, movement_type, quantity, unit_cost, reason, created_by, created_at, to_location_id)
SELECT gen_random_uuid(), p.product_id, 'POSITIVE_ADJUSTMENT', p.quantity, p.unit_cost,
       'Corrección de ubicación: stock ingresado sin bodega', 'reparacion', NOW(),
       (SELECT id FROM destino)
FROM pendientes p;

-- ── 2. Retirar el mismo stock de "ninguna parte" ─────────────────────────────
-- Sin esto el total quedaría duplicado: la entrada original sigue sumando.
INSERT INTO inventory_movements
    (id, product_id, movement_type, quantity, unit_cost, reason, created_by, created_at, from_location_id)
SELECT gen_random_uuid(), p.product_id, 'NEGATIVE_ADJUSTMENT', p.quantity, p.unit_cost,
       'Corrección de ubicación: retiro del stock sin bodega', 'reparacion', NOW(),
       NULL
FROM pendientes p;

-- ── 3. Ubicar los lotes ──────────────────────────────────────────────────────
-- El FIFO consume lotes por bodega: sin esto la salida no encontraría de dónde
-- descontar aunque los movimientos ya estuvieran bien ubicados.
UPDATE lots SET warehouse_id = (SELECT id FROM destino) WHERE warehouse_id IS NULL;

-- ── 4. Comprobación ──────────────────────────────────────────────────────────
DO $$
DECLARE
    lotes INT;
BEGIN
    SELECT count(*) INTO lotes FROM lots WHERE warehouse_id IS NULL;
    IF lotes > 0 THEN
        RAISE EXCEPTION 'Quedaron % lotes sin bodega', lotes;
    END IF;
END $$;

COMMIT;
