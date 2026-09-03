package com.sapiens.erp.modules.inventory.domain;

/**
 * Si el documento tiene un costo confiable.
 * <p>
 * {@link #UNCOSTED} NO es lo mismo que un costo de cero. Un costo desconocido
 * tratado como cero produce un margen artificial cercano al 100% y una
 * valoración de inventario falsa. Se marca y se costea después, cuando exista
 * el dato real.
 */
public enum CostingStatus {
    /** Todavía en borrador: no se ha intentado costear. */
    PENDING,
    /** Todos los consumos tenían costo conocido. */
    COSTED,
    /** Al menos un consumo no tenía costo. El documento no vale para margen. */
    UNCOSTED
}
