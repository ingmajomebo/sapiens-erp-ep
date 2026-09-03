package com.sapiens.erp.modules.inventory.domain;

/**
 * Qué representa el renglón.
 * <p>
 * La merma se captura explícitamente en vez de deducirse de la diferencia:
 * así se puede distinguir "3 kg de espinas" de "3 kg que no sabemos dónde
 * quedaron", que operativamente no son lo mismo.
 */
public enum TransformationLineKind {
    /** Mercancía real. Entra al inventario y recibe costo. */
    PRODUCT,
    /** Lo que se perdió al procesar. NO entra al inventario ni recibe costo. */
    WASTE
}
