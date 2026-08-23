package com.sapiens.erp.modules.storefront.domain;

/** A qué apunta una portada de catálogo. Define también la forma de la ruta. */
public enum CategoryKind {
    /** /pescados */
    CATEGORY,
    /** /pescados/carne-roja */
    SUBCATEGORY,
    /** /pescados/atun — el nivel de especie, que es el group_slug de la vitrina */
    SPECIES
}
