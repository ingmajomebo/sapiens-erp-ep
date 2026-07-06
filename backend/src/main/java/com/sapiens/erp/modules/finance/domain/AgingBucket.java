package com.sapiens.erp.modules.finance.domain;

/** Bucket de antigüedad de cartera, sobre el saldo pendiente y la due_date original. */
public enum AgingBucket {
    CURRENT,
    D1_30,
    D31_60,
    D60_PLUS
}
