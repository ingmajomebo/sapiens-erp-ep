-- V30: Módulo de Clientes — identificación fiscal, contacto ampliado y condiciones de pago
-- Los clientes existentes (creados desde Ventas) quedan con documento NULL hasta completarlos.

ALTER TABLE customers ADD COLUMN document_type VARCHAR(20);
ALTER TABLE customers ADD COLUMN document_number VARCHAR(30);
ALTER TABLE customers ADD COLUMN legal_name VARCHAR(200);
ALTER TABLE customers ADD COLUMN address VARCHAR(200);
ALTER TABLE customers ADD COLUMN city VARCHAR(100);
ALTER TABLE customers ADD COLUMN default_payment_term_days INT;
ALTER TABLE customers ADD COLUMN notes TEXT;

-- Documento único entre clientes activos (patrón de unicidad parcial de V21/V24)
CREATE UNIQUE INDEX ux_customers_document
    ON customers (document_type, document_number)
    WHERE deleted_at IS NULL AND document_number IS NOT NULL;

CREATE INDEX idx_customers_name ON customers (LOWER(name)) WHERE deleted_at IS NULL;
