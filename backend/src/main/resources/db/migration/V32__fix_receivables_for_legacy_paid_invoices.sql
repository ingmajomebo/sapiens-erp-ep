-- V32: Corrección de datos — facturas pagadas antes del modelo de pagos (V29)
-- no tienen filas en sales_invoice_payments, por lo que el backfill de V31 les
-- abrió una CxC PENDING aunque la factura ya está PAID. El estado de la factura
-- es la fuente autoritativa para ese histórico: se cierran esas CxC.
-- (Excepción documentada a la regla "derivar de recibos": no existe recibo
--  posible para pagos anteriores al modelo.)

UPDATE accounts_receivable ar
SET paid = ar.total,
    pending = 0,
    status = 'PAID',
    updated_at = NOW()
FROM sales_invoices i
WHERE i.id = ar.invoice_id
  AND i.deleted_at IS NULL
  AND i.status = 'PAID'
  AND ar.status IN ('PENDING', 'PARTIALLY_PAID');
