package com.sapiens.erp.modules.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    List<Warehouse> findAllByDeletedAtIsNullOrderByNameAsc();

    Optional<Warehouse> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);

    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, UUID id);

    List<Warehouse> findAllByIsDefaultTrueAndDeletedAtIsNull();

    Optional<Warehouse> findFirstByIsDefaultTrueAndDeletedAtIsNull();
}
