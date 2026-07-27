-- V38: Separar número de factura de la creación del borrador.
-- El número fiscal (FV-XXXXXX) se asigna únicamente al emitir, de forma atómica
-- usando la secuencia nativa sales_invoice_number_seq (creada en V28).
-- En estado BORRADOR el campo queda NULL; la UI muestra "—".

-- 1. Permitir NULL (los borradores no tienen número aún)
ALTER TABLE sales_invoices
    ALTER COLUMN invoice_number DROP NOT NULL;

-- 2. Eliminar el índice UNIQUE implícito que PostgreSQL creó al definir la columna como UNIQUE
--    (nombre estándar: <tabla>_<columna>_key)
ALTER TABLE sales_invoices
    DROP CONSTRAINT IF EXISTS sales_invoices_invoice_number_key;

-- 3. Índice único parcial: garantiza unicidad solo entre facturas con número asignado.
--    Permite múltiples borradores (NULL) sin colisión.
CREATE UNIQUE INDEX idx_sales_invoices_invoice_number
    ON sales_invoices(invoice_number)
    WHERE invoice_number IS NOT NULL;
