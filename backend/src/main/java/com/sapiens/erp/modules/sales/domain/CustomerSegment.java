package com.sapiens.erp.modules.sales.domain;

/**
 * Segmento derivado del comportamiento de compra. No se persiste:
 * se calcula con los umbrales configurables en app.customers.segmentation.*
 */
public enum CustomerSegment {
    /** Sin compras o con pocas compras recientes. */
    NEW,
    /** Compra con regularidad. */
    RECURRING,
    /** Superó el umbral de días sin comprar. */
    AT_RISK,
    /** Superó el umbral de inactividad. */
    INACTIVE
}
