package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/** Cuántas unidades base vale una unidad de medida. KG es la base de masa. */
@Entity
@Table(name = "unit_conversions")
@Getter
@NoArgsConstructor
public class UnitConversion {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private UnitOfMeasure unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "base_unit", nullable = false, length = 10)
    private UnitOfMeasure baseUnit;

    @Column(nullable = false, precision = 18, scale = 9)
    private BigDecimal factor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
