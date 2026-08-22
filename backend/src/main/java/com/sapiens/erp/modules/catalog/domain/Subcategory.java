package com.sapiens.erp.modules.catalog.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Subcategoría de catálogo. Siempre cuelga de una categoría; el nombre es
 * único dentro de esa categoría, no globalmente.
 */
@Entity
@Table(name = "subcategories")
@Getter
@Setter
@NoArgsConstructor
public class Subcategory extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    public static Subcategory create(Category category, String name, String description) {
        Subcategory s = new Subcategory();
        s.id = UUID.randomUUID();
        s.category = category;
        s.name = name;
        s.description = description;
        return s;
    }
}
