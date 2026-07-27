package com.sapiens.erp.modules.catalog.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "warehouses")
@Getter
@Setter
@NoArgsConstructor
public class Warehouse extends AuditableEntity {

    @Id
    private UUID id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(precision = 10, scale = 3)
    private BigDecimal capacity;

    @Column(name = "capacity_unit", length = 10, nullable = false)
    private String capacityUnit = "kg";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    public static Warehouse create(String name, BigDecimal capacity, String capacityUnit, String description) {
        Warehouse w = new Warehouse();
        w.id = UUID.randomUUID();
        w.name = name;
        w.capacity = capacity;
        w.capacityUnit = capacityUnit != null && !capacityUnit.isBlank() ? capacityUnit : "kg";
        w.description = description;
        w.active = true;
        return w;
    }
}
