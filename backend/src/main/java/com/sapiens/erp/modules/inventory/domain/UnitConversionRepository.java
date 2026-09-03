package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnitConversionRepository extends JpaRepository<UnitConversion, UnitOfMeasure> {
}
