-- Publica en la vitrina todo producto del ERP que aún no esté publicado.
--
-- Criterios, todos conservadores:
--
--   · NO se inventan agrupaciones. Cada producto entra como su propio grupo.
--     Las familias ya armadas a mano (atún, calamar) no se tocan. Agrupar por
--     parecido de nombre produciría errores difíciles de ver.
--   · NO se inventa el origen: queda NULL hasta que alguien lo cargue.
--   · El peso solo se lee cuando está escrito sin ambigüedad en el nombre.
--     "250 mil" no se interpreta: puede ser 250 ml o un error de captura.
--   · Los que se venden por kilo quedan con peso 1 kg, que es literal: su
--     precio ES el precio por kilo.
--
-- Idempotente: correrlo de nuevo solo agrega lo que falte.

WITH candidatos AS (
    SELECT
        p.id,
        p.name,
        p.unit_of_measure,
        -- Slug legible y estable a partir del nombre
        lower(regexp_replace(
            regexp_replace(translate(p.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'),
            '(^-|-$)', '', 'g')) AS base_slug,
        -- Peso explícito en el nombre: "200 GR", "40 Gr", "1 kg"
        (regexp_match(p.name, '([0-9]+(?:[.,][0-9]+)?)\s*(kg|gr|g|ml|l)\y', 'i')) AS peso
    FROM products p
    WHERE p.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM storefront_products sp
          WHERE sp.product_id = p.id AND sp.deleted_at IS NULL
      )
),
resuelto AS (
    SELECT
        c.*,
        CASE
            WHEN c.peso IS NOT NULL THEN
                replace(c.peso[1], ',', '.')::numeric
            WHEN c.unit_of_measure = 'KG' THEN 1
            ELSE NULL
        END AS w_valor,
        CASE
            WHEN c.peso IS NOT NULL THEN
                CASE lower(c.peso[2]) WHEN 'gr' THEN 'G' ELSE upper(c.peso[2]) END
            WHEN c.unit_of_measure = 'KG' THEN 'KG'
            ELSE NULL
        END AS w_unidad
    FROM candidatos c
)
INSERT INTO storefront_products (
    product_id, slug, group_slug, group_name,
    axis_presentation, axis_size, weight_value, weight_unit,
    sort_order, published
)
SELECT
    r.id,
    -- El índice único exige slug irrepetible: se desempata con el id
    CASE WHEN EXISTS (SELECT 1 FROM storefront_products x WHERE x.slug = r.base_slug AND x.deleted_at IS NULL)
         THEN r.base_slug || '-' || left(r.id::text, 6)
         ELSE r.base_slug END,
    r.base_slug,
    r.name,
    NULL,
    -- Lo que ve el cliente: el peso si se conoce, si no cómo se vende
    CASE
        WHEN r.peso IS NOT NULL THEN
            trim(replace(r.peso[1], ',', '.')) || ' ' ||
            CASE lower(r.peso[2]) WHEN 'gr' THEN 'g' WHEN 'kg' THEN 'kg' WHEN 'l' THEN 'L' ELSE lower(r.peso[2]) END
        WHEN r.unit_of_measure = 'KG'      THEN 'Por kilo'
        WHEN r.unit_of_measure = 'PACKAGE' THEN 'Paquete'
        ELSE 'Unidad'
    END,
    r.w_valor,
    r.w_unidad,
    100,
    TRUE
FROM resuelto r;
