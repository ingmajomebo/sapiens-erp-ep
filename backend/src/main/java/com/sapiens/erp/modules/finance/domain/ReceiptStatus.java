package com.sapiens.erp.modules.finance.domain;

/** Los recibos de caja nunca se borran: se anulan con VOIDED y rastro de auditoría. */
public enum ReceiptStatus {
    ACTIVE,
    VOIDED
}
