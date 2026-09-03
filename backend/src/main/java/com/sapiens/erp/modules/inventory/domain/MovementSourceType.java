package com.sapiens.erp.modules.inventory.domain;

/**
 * Qué documento originó un movimiento.
 * <p>
 * Permite abrir una transformación y ver sus movimientos, y abrir un
 * movimiento y saber de dónde salió. Los movimientos anteriores a esto
 * quedan con origen nulo: no se va a inventar de dónde vinieron.
 */
public enum MovementSourceType {
    INVENTORY_TRANSFORMATION,
    /** Reversión de una transformación anulada. */
    INVENTORY_TRANSFORMATION_REVERSAL
}
