-- Reorganiza Pescados y Mariscos con la ESPECIE como subcategoría.
--
-- Por qué: hoy la subcategoría es una clasificación culinaria (Carne Roja,
-- Cefalópodos). Nadie navega buscando "Carne Roja": buscan salmón. Y "Calamar"
-- no existía en el ERP — eran tres productos sueltos y un texto repetido en la
-- vitrina, invisible para compras y reportes.
--
-- Después de esto:
--   Pescados > Salmón > (Filete 500 g · Posta 1 kg · Entero 2 kg)
--
-- La clasificación anterior NO se pierde: pasa a ser atributo filtrable, que
-- es lo que siempre fue. Idempotente: se puede correr de nuevo sin duplicar.

-- Todo en una transacción: la tabla temporal la exige (ON COMMIT DROP), y de
-- paso la reorganización queda todo-o-nada. Una reasignación a medias dejaría
-- productos huérfanos entre dos clasificaciones.
BEGIN;

-- ── 0. Ejes de filtro para la clasificación que se desplaza ──────────────────
INSERT INTO storefront_attribute_definitions (attribute_key, label, filterable, sort_order) VALUES
    ('carne',   'Tipo de carne', TRUE, 40),
    ('familia', 'Familia',       TRUE, 50)
ON CONFLICT (attribute_key) DO NOTHING;

-- ── 1. El mapa, explícito y revisable ───────────────────────────────────────
CREATE TEMP TABLE mapa (producto TEXT, especie TEXT, clase TEXT) ON COMMIT DROP;
INSERT INTO mapa VALUES
    ('Atún de aleta amarillo',        'Atún',       'Roja'),
    ('Atún Humado',                   'Atún',       'Roja'),
    ('Filete de atún aleta amarillo', 'Atún',       'Roja'),
    ('Bagre de Mar',                  'Bagre',      'Roja'),
    ('Posta de Sardinata',            'Sardinata',  'Roja'),
    ('Salmon Premium',                'Salmón',     'Roja'),
    ('Trucha',                        'Trucha',     'Roja'),
    ('Filete de basa',                'Basa',       'Blanca'),
    ('Filete de Bravo o Medregal',    'Medregal',   'Blanca'),
    ('Filete de dorado',              'Dorado',     'Blanca'),
    ('Filete de tilapia',             'Tilapia',    'Blanca'),
    ('Tilapia Entera',                'Tilapia',    'Blanca'),
    ('Pargo Rojo',                    'Pargo',      'Blanca'),
    ('Sierra Castilla',               'Sierra',     'Blanca'),
    -- Preparados y mixtos van sin clase: no sabemos de qué pescado salieron
    -- y ponerle una etiqueta al azar sería peor que dejarla vacía.
    ('Recortes de pescado',           'Preparados', NULL),
    ('Salpicon de Atún 200 GR',       'Preparados', NULL),
    ('Anillos de calamar',            'Calamar',    'Cefalópodos'),
    ('Calamar pota',                  'Calamar',    'Cefalópodos'),
    ('Calamar rejo',                  'Calamar',    'Cefalópodos'),
    ('Calamar Tubo',                  'Calamar',    'Cefalópodos'),
    ('Camarones crudos talla 21/25',  'Camarón',    'Crustáceos'),
    -- Gamba y langostino quedan aparte del camarón a propósito: se compran y
    -- se cotizan distinto. Unirlos después es un UPDATE; separarlos, un lío.
    ('Gambas',                        'Gamba',      'Crustáceos'),
    ('Langostino Tigre',              'Langostino', 'Crustáceos'),
    ('Cola de langosta',              'Langosta',   'Crustáceos'),
    ('Mejillones',                    'Mejillón',   'Bivalvos'),
    ('Mixtura',                       'Mixtos',     NULL);

-- ── 2. Guardar la clasificación actual ANTES de reasignar ───────────────────
-- Se lee de la subcategoría vigente, no del mapa: así conserva lo que de
-- verdad había cargado, incluso donde el mapa y el ERP no coincidan.
INSERT INTO storefront_product_attributes (id, product_id, attribute_key, attribute_value)
SELECT gen_random_uuid(), sp.product_id,
       CASE WHEN s.name IN ('Carne Roja', 'Carne Blanca') THEN 'carne' ELSE 'familia' END,
       CASE WHEN s.name = 'Carne Roja' THEN 'Roja'
            WHEN s.name = 'Carne Blanca' THEN 'Blanca'
            ELSE s.name END
FROM storefront_products sp
JOIN products p ON p.id = sp.product_id
JOIN subcategories s ON s.id = p.subcategory_id
WHERE sp.deleted_at IS NULL
  AND s.name IN ('Carne Roja', 'Carne Blanca', 'Cefalópodos', 'Crustáceos', 'Bivalvos')
ON CONFLICT (product_id, attribute_key, attribute_value) DO NOTHING;

-- ── 3. Crear las especies como subcategorías ────────────────────────────────
-- El DISTINCT va ANTES de generar el uuid: si no, cada fila sale única y los
-- cuatro productos de calamar crearían cuatro subcategorías "Calamar".
-- La comparación es sin distinguir mayúsculas porque así es el índice único.
INSERT INTO subcategories (id, category_id, name, created_at, updated_at)
SELECT gen_random_uuid(), d.category_id, d.especie, NOW(), NOW()
FROM (
    SELECT DISTINCT p.category_id, m.especie
    FROM mapa m
    JOIN products p ON p.name = m.producto AND p.deleted_at IS NULL
) d
WHERE NOT EXISTS (
    SELECT 1 FROM subcategories s
    WHERE s.category_id = d.category_id
      AND lower(s.name) = lower(d.especie)
      AND s.deleted_at IS NULL
);

-- ── 4. Reasignar cada producto a su especie ─────────────────────────────────
UPDATE products p
SET subcategory_id = s.id, updated_at = NOW()
FROM mapa m
JOIN products p2 ON p2.name = m.producto
JOIN subcategories s ON lower(s.name) = lower(m.especie) AND s.category_id = p2.category_id AND s.deleted_at IS NULL
WHERE p.id = p2.id AND p.deleted_at IS NULL
  AND p.subcategory_id IS DISTINCT FROM s.id;

-- ── 5. La vitrina agrupa por la especie, no por texto suelto ────────────────
-- Esto arregla de paso la fragmentación: los cuatro calamares eran cuatro
-- familias distintas y ahora son una sola con cuatro presentaciones.
UPDATE storefront_products sp
SET group_slug = lower(regexp_replace(
        regexp_replace(translate(s.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g')),
    group_name = s.name,
    updated_at = NOW()
FROM products p
JOIN subcategories s ON s.id = p.subcategory_id AND s.deleted_at IS NULL
JOIN categories c ON c.id = p.category_id
WHERE sp.product_id = p.id AND sp.deleted_at IS NULL
  AND c.name IN ('Pescados', 'Mariscos');

-- ── 6. Portadas: la especie ahora es una subcategoría ───────────────────────
-- Se retiran las portadas de tipo SPECIES de estas categorías para que no
-- queden dos páginas del mismo pescado en rutas distintas.
-- Se identifican por su categoría padre, NO por group_slug: el paso anterior
-- acaba de reescribirlo, así que buscarlas por ahí no encontraría ninguna y
-- quedarían rutas muertas como /pescados/salmon-premium.
UPDATE storefront_categories sc
SET deleted_at = NOW()
WHERE sc.kind = 'SPECIES' AND sc.deleted_at IS NULL
  AND sc.parent_slug IN (
      SELECT padre.slug FROM storefront_categories padre
      JOIN categories c ON c.id = padre.category_id
      WHERE padre.kind = 'CATEGORY' AND padre.deleted_at IS NULL
        AND c.name IN ('Pescados', 'Mariscos')
  );

INSERT INTO storefront_categories (id, kind, slug, parent_slug, subcategory_id, title, description, banner_alt, sort_order, published)
SELECT
    gen_random_uuid(), 'SUBCATEGORY',
    lower(regexp_replace(regexp_replace(translate(s.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
    padre.slug,
    s.id,
    s.name,
    '',
    s.name || ' del Pacífico colombiano',
    100,
    TRUE
FROM subcategories s
JOIN storefront_categories padre
     ON padre.kind = 'CATEGORY' AND padre.category_id = s.category_id AND padre.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND EXISTS (
      SELECT 1 FROM products p
      JOIN storefront_products sp ON sp.product_id = p.id AND sp.published AND sp.deleted_at IS NULL
      WHERE p.subcategory_id = s.id AND p.deleted_at IS NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM storefront_categories x
      WHERE x.kind = 'SUBCATEGORY' AND x.subcategory_id = s.id AND x.deleted_at IS NULL
  );

COMMIT;
