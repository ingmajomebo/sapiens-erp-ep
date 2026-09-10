package com.sapiens.erp.modules.catalog.domain;

/**
 * Para qué sirve cada foto de un producto.
 *
 * <p>El rol NO es una etiqueta decorativa: decide dónde aparece la imagen.
 * PRINCIPAL y HOVER son únicas por producto —lo garantiza un índice parcial en
 * la base, no el código— porque dos principales dejarían el catálogo mostrando
 * una u otra según el orden de la consulta.
 */
public enum ProductImageRole {
    /** La que se ve siempre: tarjeta del catálogo y primera de la ficha. */
    PRIMARY,
    /** La segunda, que se revela al pasar el cursor en escritorio. */
    HOVER,
    /** Las demás, para la galería de la ficha de producto. */
    GALLERY
}
