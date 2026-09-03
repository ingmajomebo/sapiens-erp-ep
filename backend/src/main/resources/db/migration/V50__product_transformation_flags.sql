-- V50: qué productos participan en transformaciones.
--
-- EL PROBLEMA
-- El selector de transformaciones ofrecía los 34 productos del catálogo. La
-- mayoría no tiene sentido ahí: nadie transforma agua de coco ni pasta de
-- achiote. Buscar el atún entre treinta opciones irrelevantes es lento y
-- facilita elegir el producto equivocado.
--
-- DOS MARCAS, NO UNA
-- Un producto puede ser las dos cosas a la vez. Un filete de atún se OBTIENE
-- del atún entero y además se CONSUME para hacer hamburguesas. Con un solo
-- campo habría que elegir, y la cadena de producción quedaría partida.
--
-- POR DEFECTO EN FALSE
-- Es una lista de excepciones, no de exclusiones: se marca lo que sí
-- participa. Poner TRUE por defecto devolvería el problema — treinta
-- productos irrelevantes en el selector — y obligaría a desmarcarlos uno a uno.

ALTER TABLE products
    ADD COLUMN transformation_input_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE products
    ADD COLUMN transformation_output_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.transformation_input_enabled IS
    'El producto puede CONSUMIRSE en una transformación (sale del inventario)';
COMMENT ON COLUMN products.transformation_output_enabled IS
    'El producto puede OBTENERSE de una transformación (entra al inventario)';

-- Índices parciales: el selector solo consulta los habilitados, que serán
-- siempre una minoría del catálogo.
CREATE INDEX idx_products_transformation_input
    ON products (id) WHERE transformation_input_enabled AND deleted_at IS NULL;

CREATE INDEX idx_products_transformation_output
    ON products (id) WHERE transformation_output_enabled AND deleted_at IS NULL;
