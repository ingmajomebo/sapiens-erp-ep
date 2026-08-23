package com.sapiens.erp.modules.storefront.domain;

import java.math.BigDecimal;

/**
 * Unidad comercial de la presentación.
 * <p>
 * {@link #toGrams} normaliza para poder comparar y filtrar por peso. Las
 * unidades que no son masa devuelven {@code null} a propósito: un paquete no
 * pesa nada comparable, y forzar un número ahí produciría filtros que mienten.
 */
public enum WeightUnit {
    G, KG, LB, ML, L, UNIT, PACKAGE;

    private static final BigDecimal MIL = BigDecimal.valueOf(1000);
    private static final BigDecimal LIBRA_EN_GRAMOS = BigDecimal.valueOf(453.592);

    public BigDecimal toGrams(BigDecimal value) {
        if (value == null) return null;
        return switch (this) {
            case G, ML -> value;
            case KG, L -> value.multiply(MIL);
            case LB    -> value.multiply(LIBRA_EN_GRAMOS);
            case UNIT, PACKAGE -> null;
        };
    }

    /** Etiqueta corta para mostrar: "500 g", "1 kg". */
    public String label() {
        return switch (this) {
            case G -> "g";
            case KG -> "kg";
            case LB -> "lb";
            case ML -> "ml";
            case L -> "L";
            case UNIT -> "unidad";
            case PACKAGE -> "paquete";
        };
    }
}
