package com.sapiens.erp.modules.finance.domain.exception;

/**
 * La factura no se puede anular mientras su CxC tenga recibos de caja ACTIVE:
 * primero deben anularse esos recibos con su rastro de auditoría.
 */
public class ReceivableHasActivePaymentsException extends RuntimeException {

    public ReceivableHasActivePaymentsException(String message) {
        super(message);
    }
}
