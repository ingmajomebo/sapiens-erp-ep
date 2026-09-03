package com.sapiens.erp.modules.inventory.domain;

/**
 * A qué lado del documento pertenece un renglón.
 * <p>
 * Los nombres describen qué le pasa al INVENTARIO, no al documento. Decir
 * "entrada" y "salida" a secas se lee al revés según se mire desde la bodega
 * o desde el papel, y esa ambigüedad es justo la que hace que alguien capture
 * la materia prima donde van los productos terminados.
 */
public enum TransformationSide {
    /** SALE del inventario: la materia prima que se procesa. Genera EXIT. */
    CONSUMED,
    /** ENTRA al inventario: lo que se obtuvo. Genera ENTRY. */
    OBTAINED
}
