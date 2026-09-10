-- Alinea las marcas de tiempo de las fotos de producto con el resto del esquema.
--
-- La V48 declaró created_at, updated_at y deleted_at como TIMESTAMP sin zona,
-- mientras que todas las demás tablas del sistema usan TIMESTAMPTZ. La
-- diferencia no es cosmética: `Instant` de Java se mapea a "timestamp with
-- time zone", así que la entidad JPA no valida contra la columna y el backend
-- ni siquiera arranca. Y aun sin JPA de por medio, una fecha sin zona cambia
-- de significado según dónde corra el servidor.
--
-- No se modifica la V48 —una migración ya aplicada es inmutable— sino que se
-- corrige aquí. Las tablas están vacías en todos los ambientes, así que la
-- conversión no puede reinterpretar ninguna fecha existente; se declara UTC
-- explícitamente de todos modos, para que el día que no lo estén el resultado
-- siga siendo el correcto.

ALTER TABLE product_images
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
    ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING deleted_at AT TIME ZONE 'UTC';

ALTER TABLE product_image_variants
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

COMMENT ON TABLE product_images IS
    'Fotografías de un producto. Los bytes viven en el almacenamiento; aquí solo el identificador del archivo y sus metadatos.';
