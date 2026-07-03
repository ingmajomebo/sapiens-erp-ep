-- V26: Ruta interna del archivo de imagen gestionado por el sistema.
-- image_url (V7) sigue siendo la referencia pública (URL externa o /api/v1/products/{id}/image);
-- image_path referencia el archivo local subido para poder servirlo, reemplazarlo y no dejar huérfanos.
ALTER TABLE products ADD COLUMN image_path VARCHAR(500);
