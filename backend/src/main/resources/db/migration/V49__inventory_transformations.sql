-- V49: Transformaciones de inventario.
--
-- Una transformación es UN DOCUMENTO, no movimientos sueltos: 20 kg de atún
-- entero se convierten en filete, medallones, recortes y merma en una sola
-- operación que se confirma o no se confirma.
--
-- DIRECCIÓN (la fuente de confusión que este diseño evita):
--   CONSUMED  el producto SALE del inventario  -> genera EXIT
--   OBTAINED  el producto ENTRA al inventario  -> genera ENTRY
-- El lado se nombra por lo que le pasa al inventario, nunca "entrada/salida"
-- a secas, que se lee al revés según se mire el documento o la bodega.

-- ── 1. Origen de un movimiento ───────────────────────────────────────────────
-- Hoy un movimiento no sabe qué documento lo creó. Sin esto no se puede abrir
-- una transformación y ver sus movimientos, ni abrir un movimiento y saber de
-- dónde salió. Nullable: los movimientos históricos no tienen origen conocido
-- y no se van a inventar.
ALTER TABLE inventory_movements ADD COLUMN source_type VARCHAR(40);
ALTER TABLE inventory_movements ADD COLUMN source_id   UUID;

ALTER TABLE inventory_movements
    ADD CONSTRAINT ck_inventory_movements_source
    CHECK ((source_type IS NULL AND source_id IS NULL)
        OR (source_type IS NOT NULL AND source_id IS NOT NULL));

CREATE INDEX idx_inventory_movements_source
    ON inventory_movements (source_type, source_id)
    WHERE source_id IS NOT NULL;


-- ── 2. Conversión de unidades ────────────────────────────────────────────────
-- El rendimiento compara cantidades físicas, y sin equivalencias no se pueden
-- sumar kilos con libras. Cada unidad declara cuántas unidades base vale.
--
-- KG es la base de masa. LITER y UNIT/PACKAGE NO se convierten aquí: un litro
-- solo equivale a un kilo si se conoce la densidad, y un paquete depende del
-- producto. Para esos casos el factor vive en el producto (paso 3).
CREATE TABLE unit_conversions (
    unit        VARCHAR(10)   PRIMARY KEY,
    base_unit   VARCHAR(10)   NOT NULL,
    factor      NUMERIC(18,9) NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_unit_conversions_factor CHECK (factor > 0)
);

INSERT INTO unit_conversions (unit, base_unit, factor) VALUES
    ('KG', 'KG', 1.000000000),
    ('LB', 'KG', 0.453592370);

-- Factor propio del producto para unidades que no son masa por sí solas:
-- "1 paquete = 0.5 kg". NULL significa "no convertible", y entonces el
-- rendimiento se informa como no calculable en vez de inventar un número.
ALTER TABLE products ADD COLUMN base_unit_factor NUMERIC(18,9);
ALTER TABLE products
    ADD CONSTRAINT ck_products_base_unit_factor
    CHECK (base_unit_factor IS NULL OR base_unit_factor > 0);


-- ── 3. El documento ──────────────────────────────────────────────────────────
CREATE SEQUENCE transformation_number_seq START 1;

CREATE TABLE inventory_transformations (
    id                    UUID          PRIMARY KEY,
    number                VARCHAR(20)   NOT NULL,
    transformation_date   DATE          NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    warehouse_id          UUID          REFERENCES warehouses(id),
    notes                 TEXT,

    -- Auditoría del ciclo de vida. Cada transición deja quién y cuándo.
    created_by            VARCHAR(100),
    confirmed_by          VARCHAR(100),
    confirmed_at          TIMESTAMP,
    cancelled_by          VARCHAR(100),
    cancelled_at          TIMESTAMP,
    cancel_reason         TEXT,

    -- Congelado al confirmar. NUNCA se recalcula con datos de hoy.
    input_total_cost      NUMERIC(16,4),
    costing_status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    yield_percentage      NUMERIC(9,4),
    waste_percentage      NUMERIC(9,4),

    created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMP,

    CONSTRAINT ck_transformations_status
        CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),

    -- UNCOSTED no es COSTED con cero: un costo desconocido y un costo de cero
    -- son cosas distintas y confundirlas inventa márgenes del 100%.
    CONSTRAINT ck_transformations_costing
        CHECK (costing_status IN ('PENDING', 'COSTED', 'UNCOSTED')),

    -- Un documento confirmado tiene que decir quién y cuándo; uno anulado
    -- además, por qué. La base lo exige para que no dependa del servicio.
    CONSTRAINT ck_transformations_confirmed
        CHECK (status <> 'CONFIRMED' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)),
    CONSTRAINT ck_transformations_cancelled
        CHECK (status <> 'CANCELLED' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL
                                         AND cancel_reason IS NOT NULL))
);

CREATE UNIQUE INDEX uq_transformations_number
    ON inventory_transformations (number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_transformations_status_date
    ON inventory_transformations (status, transformation_date DESC)
    WHERE deleted_at IS NULL;


-- ── 4. Los renglones ─────────────────────────────────────────────────────────
-- Una sola tabla con `side`: los dos lados comparten casi todas las columnas y
-- separarlos obligaría a unir dos tablas para cualquier consulta del documento.
CREATE TABLE inventory_transformation_lines (
    id                    UUID          PRIMARY KEY,
    transformation_id     UUID          NOT NULL REFERENCES inventory_transformations(id) ON DELETE CASCADE,

    -- CONSUMED sale del inventario · OBTAINED entra
    side                  VARCHAR(10)   NOT NULL,
    -- PRODUCT es mercancía real; WASTE es lo que se perdió y NO entra al
    -- inventario ni recibe costo asignado.
    line_kind             VARCHAR(10)   NOT NULL DEFAULT 'PRODUCT',

    product_id            UUID          NOT NULL REFERENCES products(id),

    -- SNAPSHOT: si el producto se renombra en seis meses, el documento
    -- histórico sigue mostrando lo que decía el día que se hizo.
    product_code          VARCHAR(50),
    product_name          VARCHAR(150)  NOT NULL,

    quantity              NUMERIC(14,3) NOT NULL,
    unit                  VARCHAR(10)   NOT NULL,
    -- Cantidad en unidad base para poder comparar. NULL si no es convertible.
    base_quantity         NUMERIC(18,6),

    lot_id                UUID          REFERENCES lots(id),

    -- ── Solo lado CONSUMED ──
    unit_cost             NUMERIC(16,4),
    total_cost            NUMERIC(16,4),

    -- ── Solo lado OBTAINED ──
    -- SNAPSHOT del precio con el que se repartió el costo. Si el precio de
    -- venta cambia mañana, este documento no se mueve.
    reference_sale_price  NUMERIC(16,4),
    sale_value            NUMERIC(18,4),
    allocation_weight     NUMERIC(12,9),
    allocated_cost        NUMERIC(16,4),
    resulting_unit_cost   NUMERIC(16,4),

    costing_status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    display_order         INTEGER       NOT NULL DEFAULT 0,

    created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_transformation_lines_side  CHECK (side IN ('CONSUMED', 'OBTAINED')),
    CONSTRAINT ck_transformation_lines_kind  CHECK (line_kind IN ('PRODUCT', 'WASTE')),
    CONSTRAINT ck_transformation_lines_costing
        CHECK (costing_status IN ('PENDING', 'COSTED', 'UNCOSTED')),

    -- Toda cantidad estrictamente positiva: cero o negativo no es una línea.
    CONSTRAINT ck_transformation_lines_quantity CHECK (quantity > 0),

    -- La merma solo tiene sentido del lado obtenido: es lo que se perdió al
    -- procesar, no algo que se haya consumido de la bodega.
    CONSTRAINT ck_transformation_lines_waste_side
        CHECK (line_kind <> 'WASTE' OR side = 'OBTAINED')
);

-- Un producto no puede repetirse dentro del mismo lado. La restricción vive en
-- la base y no solo en el servicio: dos peticiones simultáneas podrían colar
-- un duplicado si únicamente lo comprobara el código.
CREATE UNIQUE INDEX uq_transformation_lines_product_per_side
    ON inventory_transformation_lines (transformation_id, side, product_id);

CREATE INDEX idx_transformation_lines_document
    ON inventory_transformation_lines (transformation_id, side, display_order);

CREATE INDEX idx_transformation_lines_product
    ON inventory_transformation_lines (product_id);
