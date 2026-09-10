package com.sapiens.erp.modules.catalog.domain;

/**
 * Si la imagen ya se puede mostrar.
 *
 * <p>Existe porque el procesamiento puede tardar. Una foto a medio generar no
 * se sirve: el catálogo nunca debe enseñar una imagen incompleta, y el panel
 * necesita poder decir "esta está en proceso" en vez de mostrar un hueco.
 */
public enum ProductImageStatus {
    PROCESSING,
    READY,
    FAILED
}
