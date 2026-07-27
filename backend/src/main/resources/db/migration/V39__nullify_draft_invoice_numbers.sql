-- V39: Limpieza de borradores legacy que recibieron número antes de V38.
-- Antes de V38, createDraftForOrder() asignaba el consecutivo FV al crear el borrador.
-- Esos números quedan como "consumidos" en la secuencia (habrá saltos en la numeración,
-- lo cual es aceptable — las secuencias fiscales pueden tener huecos por anulaciones).
-- Al emitirse, cada borrador recibirá el siguiente consecutivo disponible.

UPDATE sales_invoices
SET invoice_number = NULL,
    updated_at     = NOW()
WHERE status = 'DRAFT'
  AND invoice_number IS NOT NULL
  AND deleted_at IS NULL;
