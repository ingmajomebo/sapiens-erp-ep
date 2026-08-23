-- V47: Catálogo especializado de pescados y mariscos.
--
--   1. Portadas de categoría y especie (el hero configurable desde datos).
--   2. Atributos comerciales dinámicos por presentación.
--   3. Peso estructurado y tipo de origen en la vitrina.
--   4. Solicitudes de aviso cuando un producto agotado vuelve.
--
-- Criterio de diseño: todo lo que sea "mercadeo" vive en tablas de vitrina,
-- nunca dentro de `products`, por la misma razón que existe storefront_products.


-- ── 1. Portadas ──────────────────────────────────────────────────────────────
-- Una fila por página de catálogo con hero propio. El `kind` dice a qué apunta:
--
--   CATEGORY     /pescados            -> category_id
--   SUBCATEGORY  /pescados/carne-roja -> subcategory_id
--   SPECIES      /pescados/atun       -> group_slug de storefront_products
--
-- `parent_slug` arma la ruta y las migas de pan sin que el frontend conozca la
-- jerarquía: es un dato, no un `if`.
CREATE TABLE storefront_categories (
    id             UUID         PRIMARY KEY,
    kind           VARCHAR(20)  NOT NULL,
    slug           VARCHAR(120) NOT NULL,
    parent_slug    VARCHAR(120),

    category_id    UUID         REFERENCES categories(id),
    subcategory_id UUID         REFERENCES subcategories(id),
    group_slug     VARCHAR(120),

    title          VARCHAR(160) NOT NULL,
    description    TEXT,
    banner_path    VARCHAR(500),
    banner_alt     VARCHAR(255),

    sort_order     INTEGER      NOT NULL DEFAULT 100,
    published      BOOLEAN      NOT NULL DEFAULT FALSE,

    deleted_at     TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_storefront_categories_kind
        CHECK (kind IN ('CATEGORY', 'SUBCATEGORY', 'SPECIES')),

    -- Cada tipo apunta a exactamente un destino: sin filas ambiguas.
    CONSTRAINT ck_storefront_categories_target CHECK (
        (kind = 'CATEGORY'    AND category_id    IS NOT NULL AND subcategory_id IS NULL AND group_slug IS NULL) OR
        (kind = 'SUBCATEGORY' AND subcategory_id IS NOT NULL AND category_id    IS NULL AND group_slug IS NULL) OR
        (kind = 'SPECIES'     AND group_slug     IS NOT NULL AND category_id    IS NULL AND subcategory_id IS NULL)
    )
);

CREATE UNIQUE INDEX uq_storefront_categories_slug
    ON storefront_categories (slug)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_storefront_categories_parent
    ON storefront_categories (parent_slug, sort_order)
    WHERE deleted_at IS NULL;


-- ── 2. Atributos comerciales dinámicos ───────────────────────────────────────
-- Clave/valor por presentación. Aquí viven el corte, la procedencia y las
-- etiquetas.
--
-- El motivo de no usar columnas: los ejes cambian por especie. El camarón se
-- vende Pelado o Desvenado; el calamar en Tubo, Anillos o Rejo; el atún en Lomo
-- o Ahumado. Con columnas, cada especie nueva pediría una migración y el
-- frontend acabaría lleno de condicionales. Aquí los filtros se construyen
-- leyendo lo que de verdad existe en la categoría que se está viendo.
CREATE TABLE storefront_attribute_definitions (
    attribute_key VARCHAR(40)  PRIMARY KEY,
    label         VARCHAR(60)  NOT NULL,
    -- FALSE para lo que se muestra pero no se filtra (las etiquetas)
    filterable    BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order    INTEGER      NOT NULL DEFAULT 100,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE storefront_product_attributes (
    id              UUID        PRIMARY KEY,
    product_id      UUID        NOT NULL REFERENCES storefront_products(product_id) ON DELETE CASCADE,
    attribute_key   VARCHAR(40) NOT NULL REFERENCES storefront_attribute_definitions(attribute_key),
    attribute_value VARCHAR(80) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_storefront_product_attribute
        UNIQUE (product_id, attribute_key, attribute_value)
);

CREATE INDEX idx_storefront_product_attributes_lookup
    ON storefront_product_attributes (attribute_key, attribute_value);

INSERT INTO storefront_attribute_definitions (attribute_key, label, filterable, sort_order) VALUES
    ('presentacion', 'Presentación', TRUE,  10),
    ('procedencia',  'Procedencia',  TRUE,  20),
    ('conservacion', 'Conservación', TRUE,  30),
    ('etiqueta',     'Etiquetas',    FALSE, 90);


-- ── 3. Peso y origen en la vitrina ───────────────────────────────────────────
-- `axis_size` seguirá siendo el texto que ve el cliente ("Postas 700 g").
-- Estas columnas son su forma comparable: sin ellas no hay filtro por peso
-- ni precio por kilo.
ALTER TABLE storefront_products ADD COLUMN weight_value NUMERIC(10,3);
ALTER TABLE storefront_products ADD COLUMN weight_unit  VARCHAR(10);

-- El origen no siempre es una ciudad: Bahía Solano es un municipio, Chocó un
-- departamento y Noruega un país. Sin esto no se pueden agrupar bien.
ALTER TABLE storefront_products ADD COLUMN origin_kind VARCHAR(20);

ALTER TABLE storefront_products ADD COLUMN secondary_image_path VARCHAR(500);

ALTER TABLE storefront_products
    ADD CONSTRAINT ck_storefront_products_weight_unit
    CHECK (weight_unit IS NULL OR weight_unit IN ('G', 'KG', 'LB', 'ML', 'L', 'UNIT', 'PACKAGE'));

ALTER TABLE storefront_products
    ADD CONSTRAINT ck_storefront_products_origin_kind
    CHECK (origin_kind IS NULL OR origin_kind IN ('CITY', 'REGION', 'DEPARTMENT', 'COUNTRY'));

-- Relleno inicial leyendo el texto que ya existe ("400 g", "1 L", "Postas 700 g").
-- Ojo con \y: en PostgreSQL el límite de palabra NO es \b (que significa
-- retroceso), sino \y. Con \b esta consulta no casa con nada y el relleno
-- queda vacío en silencio.
-- Lo que no se pueda interpretar queda en NULL y se corrige desde el panel:
-- es preferible un dato ausente a uno inventado.
UPDATE storefront_products
SET weight_value = NULLIF(replace((regexp_match(axis_size, '([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|g|lb|ml|l)\y', 'i'))[1], ',', '.'), '')::numeric,
    weight_unit  = upper((regexp_match(axis_size, '[0-9]+(?:[.,][0-9]+)?\s*(kg|g|lb|ml|l)\y', 'i'))[1])
WHERE axis_size ~* '[0-9]+(?:[.,][0-9]+)?\s*(kg|g|lb|ml|l)\y';


-- ── 4. Solicitudes de aviso de disponibilidad ────────────────────────────────
-- Deliberadamente fuera del módulo de inventario: inventario registra hechos
-- del almacén y no debe saber que existe una tienda. Quien reaccione al
-- reingreso de stock leerá esta tabla, no al revés.
--
-- `channel` queda preparado para WhatsApp o correo, pero hoy nada lo consume:
-- la solicitud se registra y se atiende a mano.
CREATE TABLE stock_requests (
    id               UUID         PRIMARY KEY,
    product_id       UUID         NOT NULL REFERENCES products(id),
    account_id       UUID         REFERENCES storefront_accounts(id),

    customer_name    VARCHAR(120),
    phone            VARCHAR(40)  NOT NULL,
    email            VARCHAR(160),
    desired_quantity NUMERIC(10,3),

    status           VARCHAR(20)  NOT NULL DEFAULT 'WAITING_STOCK',
    channel          VARCHAR(20),
    requested_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    notified_at      TIMESTAMP,

    deleted_at       TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_stock_requests_status
        CHECK (status IN ('WAITING_STOCK', 'NOTIFIED', 'PURCHASED', 'CANCELLED')),
    CONSTRAINT ck_stock_requests_channel
        CHECK (channel IS NULL OR channel IN ('WHATSAPP', 'EMAIL', 'IN_APP'))
);

-- La consulta que hará el aviso: "quién espera este producto".
CREATE INDEX idx_stock_requests_pending
    ON stock_requests (product_id, status)
    WHERE deleted_at IS NULL AND status = 'WAITING_STOCK';

-- Evita que un mismo teléfono acumule solicitudes repetidas del mismo producto.
CREATE UNIQUE INDEX uq_stock_requests_open
    ON stock_requests (product_id, phone)
    WHERE deleted_at IS NULL AND status = 'WAITING_STOCK';
