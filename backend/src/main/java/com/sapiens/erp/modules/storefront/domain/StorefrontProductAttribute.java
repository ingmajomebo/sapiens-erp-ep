package com.sapiens.erp.modules.storefront.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Un atributo comercial de una presentación concreta.
 * <p>
 * Clave/valor a propósito. Los ejes cambian por especie: el camarón se vende
 * Pelado o Desvenado, el calamar en Tubo, Anillos o Rejo. Con columnas fijas,
 * cada especie nueva pediría una migración; así los filtros se construyen
 * leyendo lo que de verdad existe en la categoría que se está viendo.
 */
@Entity
@Table(name = "storefront_product_attributes")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontProductAttribute {

    @Id
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "attribute_key", nullable = false, length = 40)
    private String attributeKey;

    @Column(name = "attribute_value", nullable = false, length = 80)
    private String attributeValue;
}
