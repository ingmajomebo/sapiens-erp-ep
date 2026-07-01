-- REQ-COMPRAS-XXX: El campo NIF (tax_id) pasa a ser obligatorio.
-- Verificado: todos los proveedores activos ya tienen tax_id relleno (0 nulos).
ALTER TABLE suppliers ALTER COLUMN tax_id SET NOT NULL;
