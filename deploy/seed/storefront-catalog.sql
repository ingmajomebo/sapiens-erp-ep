-- Siembra las portadas del catálogo y los atributos comerciales a partir de lo
-- que REALMENTE está publicado. Es idempotente: se puede correr las veces que
-- haga falta y solo agrega lo que falte.
--
--   docker exec -i <postgres> psql -U sapiens -d <bd> < deploy/seed/storefront-catalog.sql
--
-- Provisional por diseño: cuando el panel del ERP permita editar portadas,
-- este script deja de hacer falta para el día a día y queda como arranque de
-- un ambiente nuevo.

-- ── 1. Portada por categoría (las que tienen algo publicado) ─────────────────
INSERT INTO storefront_categories (id, kind, slug, parent_slug, category_id, title, description, banner_path, banner_alt, sort_order, published)
SELECT
    gen_random_uuid(),
    'CATEGORY',
    lower(regexp_replace(translate(c.name, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'), '[^a-zA-Z0-9]+', '-', 'g')),
    NULL,
    c.id,
    c.name,
    coalesce(c.description, ''),
    CASE lower(c.name)
        WHEN 'pescados' THEN '/img/categoria-pescados.jpg'
        WHEN 'mariscos' THEN '/img/categoria-mariscos.jpg'
        ELSE '/img/categoria-despensa.jpg'
    END,
    'Selección de ' || lower(c.name) || ' del Pacífico colombiano',
    CASE lower(c.name) WHEN 'pescados' THEN 10 WHEN 'mariscos' THEN 20 ELSE 50 END,
    TRUE
FROM categories c
WHERE c.deleted_at IS NULL
  AND EXISTS (
      SELECT 1 FROM storefront_products sp
      JOIN products p ON p.id = sp.product_id
      WHERE p.category_id = c.id AND sp.published AND sp.deleted_at IS NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM storefront_categories x
      WHERE x.kind = 'CATEGORY' AND x.category_id = c.id AND x.deleted_at IS NULL
  );

-- ── 2. Portada por subcategoría ─────────────────────────────────────────────
-- La subcategoría ES la especie (Pescados > Salmón). Un solo criterio para
-- todo el menú: categoría y debajo sus subcategorías. Nada de mezclar niveles.
--
-- Un producto sin subcategoría no desaparece: sigue apareciendo en la página
-- de su categoría, solo que no tiene entrada propia en el menú.
INSERT INTO storefront_categories (id, kind, slug, parent_slug, subcategory_id, title, description, banner_alt, sort_order, published)
SELECT
    gen_random_uuid(), 'SUBCATEGORY',
    lower(regexp_replace(regexp_replace(translate(s.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
    padre.slug,
    s.id,
    s.name,
    '',
    s.name,
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

-- Portadas de especie: se retiran. Mezclaban niveles en el menú, poniendo
-- "Coco Rallado 200 GR" al lado de "Coco y derivados" como si fueran pares.
UPDATE storefront_categories SET deleted_at = NOW()
WHERE kind = 'SPECIES' AND deleted_at IS NULL;

-- ── 3. Atributo "presentación" desde el corte que ya está capturado ─────────
-- No se inventa nada: usa `axis_presentation`, que es lo que el panel ya llena.
INSERT INTO storefront_product_attributes (id, product_id, attribute_key, attribute_value)
SELECT gen_random_uuid(), sp.product_id, 'presentacion', sp.axis_presentation
FROM storefront_products sp
WHERE sp.deleted_at IS NULL
  AND sp.axis_presentation IS NOT NULL
  AND btrim(sp.axis_presentation) <> ''
ON CONFLICT (product_id, attribute_key, attribute_value) DO NOTHING;
