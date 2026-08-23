package com.sapiens.erp.modules.storefront.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Portada de una página de catálogo: el hero y su copy.
 * <p>
 * Vive aparte de {@code categories} por la misma razón que
 * {@link StorefrontProduct}: el banner y el titular son mercadeo, y el Core
 * Domain no debería cargar con ellos. Además una subcategoría del ERP puede
 * no tener página propia en la tienda, y al revés: una especie ("Atún") tiene
 * portada sin ser una categoría del ERP.
 */
@Entity
@Table(name = "storefront_categories")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontCategory extends AuditableEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoryKind kind;

    @Column(nullable = false, length = 120)
    private String slug;

    /** Slug del nivel superior. Null en las categorías raíz. */
    @Column(name = "parent_slug", length = 120)
    private String parentSlug;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "subcategory_id")
    private UUID subcategoryId;

    /** Solo en {@link CategoryKind#SPECIES}: el grupo de presentaciones. */
    @Column(name = "group_slug", length = 120)
    private String groupSlug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "banner_path", length = 500)
    private String bannerPath;

    @Column(name = "banner_alt", length = 255)
    private String bannerAlt;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;

    @Column(nullable = false)
    private boolean published = false;

    /** Ruta pública. Las raíces cuelgan de "/", el resto de su padre. */
    public String path() {
        return parentSlug == null || parentSlug.isBlank()
                ? "/" + slug
                : "/" + parentSlug + "/" + slug;
    }
}
