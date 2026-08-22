-- V45: Textos editables de la página pública de pedidos.
-- Clave/valor para poder añadir textos nuevos sin migrar el esquema,
-- siguiendo el patrón de ai_context_settings (V16).
-- Se siembran los valores que hoy están escritos en PublicOrderPage.tsx,
-- así la página no cambia hasta que el administrador los edite.

CREATE TABLE storefront_settings (
    id          UUID         PRIMARY KEY,
    setting_key VARCHAR(60)  NOT NULL UNIQUE,
    content     TEXT         NOT NULL,
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO storefront_settings (id, setting_key, content) VALUES
    -- Cabecera
    (gen_random_uuid(), 'brand_emoji',       '🐟'),
    (gen_random_uuid(), 'brand_name',        'LA PESCADERÍA'),
    (gen_random_uuid(), 'hero_title_1',      'Del mar a tu mesa,'),
    (gen_random_uuid(), 'hero_title_2',      'el mismo día.'),
    (gen_random_uuid(), 'hero_subtitle',     'Cada mañana elegimos el mejor género de la lonja. Pide ahora y te lo preparamos como tú quieras: limpio, fileteado o en rodajas.'),
    (gen_random_uuid(), 'hero_cta',          'Ver el género de hoy ↓'),
    -- Propuesta de valor
    (gen_random_uuid(), 'prop1_icon',        '⚓'),
    (gen_random_uuid(), 'prop1_title',       'Recibido de lonja a diario'),
    (gen_random_uuid(), 'prop1_text',        'Compramos cada madrugada en la lonja. Lo que ves es lo que ha llegado hoy.'),
    (gen_random_uuid(), 'prop2_icon',        '🔪'),
    (gen_random_uuid(), 'prop2_title',       'Preparado a tu gusto'),
    (gen_random_uuid(), 'prop2_text',        'Indícanos en las notas cómo lo quieres: entero, limpio, en filetes o en rodajas.'),
    (gen_random_uuid(), 'prop3_icon',        '🛵'),
    (gen_random_uuid(), 'prop3_title',       'Recogida o entrega hoy'),
    (gen_random_uuid(), 'prop3_text',        'Confirmamos tu pedido por teléfono y lo tienes listo el mismo día.'),
    -- Catálogo
    (gen_random_uuid(), 'catalog_eyebrow',   'El género de hoy'),
    (gen_random_uuid(), 'catalog_title',     'Elige y dinos cuánto'),
    (gen_random_uuid(), 'catalog_empty',     'Hoy no hay género publicado. Vuelve a intentarlo más tarde.'),
    -- Pedido
    (gen_random_uuid(), 'order_eyebrow',     'Tu pedido'),
    (gen_random_uuid(), 'order_title',       'Revisa y envía'),
    (gen_random_uuid(), 'order_empty',       'Aún no has elegido nada — añade género con los botones + de arriba.'),
    (gen_random_uuid(), 'order_total_label', 'Total estimado'),
    (gen_random_uuid(), 'delivery_question', '¿Cómo lo recibes?'),
    (gen_random_uuid(), 'pickup_label',      '🏪 Recojo en el local'),
    (gen_random_uuid(), 'delivery_label',    '🛵 Envío a domicilio'),
    (gen_random_uuid(), 'address_placeholder', 'Dirección de entrega *'),
    (gen_random_uuid(), 'notes_placeholder', '¿Cómo lo preparamos? ¿A qué hora pasas a recogerlo?'),
    (gen_random_uuid(), 'submit_button',     'Enviar pedido'),
    (gen_random_uuid(), 'submit_error',      'No se pudo enviar el pedido. Revisa las cantidades e inténtalo de nuevo.'),
    -- Carrito
    (gen_random_uuid(), 'cart_button',       'Revisar pedido →'),
    -- Confirmación
    (gen_random_uuid(), 'confirm_eyebrow',   'Pedido recibido'),
    (gen_random_uuid(), 'confirm_title',     '¡Marchando!'),
    (gen_random_uuid(), 'confirm_message',   'Te contactaremos para confirmar la recogida o entrega.'),
    (gen_random_uuid(), 'confirm_note',      'El importe final se ajusta al peso exacto en mostrador.'),
    -- Pie
    (gen_random_uuid(), 'footer_tagline',    'Género de lonja desde 1987'),
    (gen_random_uuid(), 'footer_address',    'Calle del Puerto, 12 · Mercado Central'),
    (gen_random_uuid(), 'footer_hours',      'Lunes a sábado · 8:00 – 15:00'),
    (gen_random_uuid(), 'footer_phone',      '+34 600 000 000');

-- ── Permiso propio para configurar la página pública ─────────────────────────
-- Editar la vitrina no es "aprobar una venta": merece su propio permiso.
INSERT INTO permissions (code, description, module) VALUES
    ('SALES_STOREFRONT_MANAGE', 'Configurar la página pública de pedidos', 'SALES');

-- ADMIN y SUPERVISOR lo reciben; OPERATOR no toca la vitrina.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'SALES_STOREFRONT_MANAGE'
  AND r.name IN ('ADMIN', 'SUPERVISOR');
