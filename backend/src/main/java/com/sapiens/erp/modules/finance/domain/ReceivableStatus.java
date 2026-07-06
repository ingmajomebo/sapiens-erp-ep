package com.sapiens.erp.modules.finance.domain;

/**
 * Estado derivado de la CxC — nunca se asigna a mano:
 * paid == 0 → PENDING; 0 < paid < total → PARTIALLY_PAID; paid == total → PAID.
 * CANCELLED cuando se anula la factura origen (fuera de cartera).
 */
public enum ReceivableStatus {
    PENDING,
    PARTIALLY_PAID,
    PAID,
    CANCELLED
}
