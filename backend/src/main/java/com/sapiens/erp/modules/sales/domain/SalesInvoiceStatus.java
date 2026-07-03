package com.sapiens.erp.modules.sales.domain;

/**
 * Ciclo de la factura: DRAFT (borrador al generarla desde el pedido) → ISSUED (emitida)
 * → PARTIALLY_PAID/PAID según los pagos registrados. Cancelable con novedad; si estaba
 * emitida o pagada, la cancelación genera nota crédito.
 * VENCIDA no se persiste: se deriva (emitida/pago parcial + due_date pasada).
 */
public enum SalesInvoiceStatus {
    DRAFT,
    ISSUED,
    PARTIALLY_PAID,
    PAID,
    CANCELLED
}
