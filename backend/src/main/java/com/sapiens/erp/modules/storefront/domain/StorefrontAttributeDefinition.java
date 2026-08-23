package com.sapiens.erp.modules.storefront.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Declaración de un atributo comercial: su etiqueta visible, si se puede
 * filtrar por él y en qué orden aparece en la barra lateral.
 * <p>
 * Existe para que agregar un eje nuevo ("Calibre", "Corte del lomo") sea
 * insertar una fila, no editar el frontend.
 */
@Entity
@Table(name = "storefront_attribute_definitions")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontAttributeDefinition {

    @Id
    @Column(name = "attribute_key", length = 40)
    private String attributeKey;

    @Column(nullable = false, length = 60)
    private String label;

    /** Las etiquetas de la tarjeta se muestran pero no se filtran. */
    @Column(nullable = false)
    private boolean filterable = true;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;
}
