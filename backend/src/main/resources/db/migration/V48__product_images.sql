-- V48: varias imágenes por producto, procesadas y servidas en WebP.
--
-- Antes: una sola foto por producto (products.image_path), guardada tal como
-- se subió. Sin hover, sin galería, sin WebP y sin corrección de orientación.
--
-- Nada se borra aquí. products.image_path y products.image_url siguen en pie
-- y siguen funcionando: la migración de las fotos existentes es un script
-- aparte que se ejecuta cuando se quiera, y el endpoint viejo se mantiene
-- mientras haya productos sin migrar.

-- ── 1. La imagen ─────────────────────────────────────────────────────────────
-- Una fila por fotografía. Los bytes NO viven aquí: PostgreSQL guarda
-- identificadores y metadatos, y los archivos van al almacenamiento.
CREATE TABLE product_images (
    id                UUID         PRIMARY KEY,
    product_id        UUID         NOT NULL REFERENCES products(id),

    -- PRIMARY: la que se ve siempre · HOVER: la segunda en escritorio
    -- GALLERY: las demás, para la ficha de producto
    role              VARCHAR(20)  NOT NULL,

    -- El procesamiento genera tres tamaños y puede tardar. Mientras tanto la
    -- imagen existe pero no se sirve: así el panel puede mostrar el avance
    -- y el catálogo nunca enseña una foto a medio hacer.
    status            VARCHAR(20)  NOT NULL DEFAULT 'PROCESSING',
    failure_reason    TEXT,

    -- Identificador opaco del archivo en el almacenamiento, sin extensión ni
    -- tamaño: quien guarda decide cómo se llama cada variante. Cambiar de
    -- disco local a S3 no toca esta columna.
    storage_key       VARCHAR(255) NOT NULL,

    -- Solo informativo, para que el administrador reconozca lo que subió.
    -- NUNCA se usa para construir la ruta física.
    original_filename VARCHAR(255),
    original_width    INTEGER,
    original_height   INTEGER,
    original_bytes    INTEGER,

    alt_text          VARCHAR(255),
    display_order     INTEGER      NOT NULL DEFAULT 0,

    deleted_at        TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_product_images_role
        CHECK (role IN ('PRIMARY', 'HOVER', 'GALLERY')),
    CONSTRAINT ck_product_images_status
        CHECK (status IN ('PROCESSING', 'READY', 'FAILED'))
);

-- Un producto tiene como mucho una principal y una de hover. La restricción
-- vive en la base y no en el servicio: dos peticiones a la vez podrían
-- dejar dos principales si solo lo comprobara el código.
CREATE UNIQUE INDEX uq_product_images_primary
    ON product_images (product_id)
    WHERE role = 'PRIMARY' AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_product_images_hover
    ON product_images (product_id)
    WHERE role = 'HOVER' AND deleted_at IS NULL;

-- La consulta del catálogo: las imágenes listas de un conjunto de productos,
-- en orden. Sin esto el listado haría un recorrido completo por cada tarjeta.
CREATE INDEX idx_product_images_lookup
    ON product_images (product_id, role, display_order)
    WHERE deleted_at IS NULL AND status = 'READY';

CREATE UNIQUE INDEX uq_product_images_storage_key
    ON product_images (storage_key)
    WHERE deleted_at IS NULL;


-- ── 2. Las variantes ─────────────────────────────────────────────────────────
-- Un tamaño concreto ya generado. Se guardan las dimensiones REALES, no las
-- pedidas: a una foto de 500 px no se le hace upscale a 1200, así que la
-- variante puede medir menos que su nombre.
CREATE TABLE product_image_variants (
    id           UUID         PRIMARY KEY,
    image_id     UUID         NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,

    -- Ancho nominal (300/600/1200): es lo que pide el frontend en srcSet
    target_width INTEGER      NOT NULL,
    width        INTEGER      NOT NULL,
    height       INTEGER      NOT NULL,
    format       VARCHAR(10)  NOT NULL,
    byte_size    INTEGER      NOT NULL,
    storage_path VARCHAR(500) NOT NULL,

    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_product_image_variants_format CHECK (format IN ('WEBP', 'JPEG')),
    CONSTRAINT uq_product_image_variant UNIQUE (image_id, target_width, format)
);

CREATE INDEX idx_product_image_variants_image
    ON product_image_variants (image_id, target_width);
