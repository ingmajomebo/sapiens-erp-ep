package com.sapiens.erp.modules.finance.domain;

/** Medio de pago del recibo. OTHER cubre pagos migrados del flujo simple de facturación. */
public enum ReceiptPaymentMethod {
    CASH,
    CARD,
    TRANSFER,
    OTHER
}
