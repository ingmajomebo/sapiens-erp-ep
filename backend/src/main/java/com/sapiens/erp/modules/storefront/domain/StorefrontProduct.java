package com.sapiens.erp.modules.storefront.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Ficha de vitrina de un producto publicado en la tienda.
 * <p>
 * Cada fila es una presentación vendible con stock propio en el ERP:
 * "Pargo rojo · Filete 500 g" y "Pargo rojo · Entero 1 kg" son dos productos
 * distintos que la tienda agrupa por {@code groupSlug}.
 */
@Entity
@Table(name = "storefront_products")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontProduct extends AuditableEntity {

    /** Comparte clave primaria con el producto: relación uno a uno. */
    @Id
    @Column(name = "product_id")
    private UUID productId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 120)
    private String slug;

    @Column(name = "group_slug", nullable = false, length = 120)
    private String groupSlug;

    @Column(name = "group_name", nullable = false, length = 120)
    private String groupName;

    /** Eje 1 del selector. Null cuando el grupo tiene una sola presentación. */
    @Column(name = "axis_presentation", length = 60)
    private String axisPresentation;

    /** Eje 2 del selector. Siempre presente. */
    @Column(name = "axis_size", nullable = false, length = 60)
    private String axisSize;

    @Column(length = 80)
    private String origin;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String conservation;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;

    @Column(nullable = false)
    private boolean published = false;

    /** Nombre visible de la presentación: "Filete 500 g" o solo "500 g". */
    public String variantName() {
        return axisPresentation == null || axisPresentation.isBlank()
                ? axisSize
                : axisPresentation + " " + axisSize;
    }
}
