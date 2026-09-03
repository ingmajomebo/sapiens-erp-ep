package com.sapiens.erp.modules.inventory.domain;

/**
 * Ciclo de vida del documento de transformación.
 * <p>
 * Solo {@link #CONFIRMED} tiene efecto en el inventario. Un documento
 * confirmado no se edita: si está mal, se anula y se hace uno nuevo.
 */
public enum TransformationStatus {
    /** Se está capturando. No mueve una sola unidad. */
    DRAFT,
    /** Movimientos generados. Ya no se puede editar. */
    CONFIRMED,
    /** Revertido con movimientos inversos. El documento se conserva entero. */
    CANCELLED
}
