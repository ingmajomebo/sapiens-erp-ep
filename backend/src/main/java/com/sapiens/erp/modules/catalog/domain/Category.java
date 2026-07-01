package com.sapiens.erp.modules.catalog.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
public class Category extends AuditableEntity {

    @Id
    private UUID id;

    @Column(length = 100, nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    public static Category create(String name, String description) {
        Category c = new Category();
        c.id = UUID.randomUUID();
        c.name = name;
        c.description = description;
        return c;
    }
}
