package com.sapiens.erp.modules.catalog.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Page<Product> findAllByDeletedAtIsNull(Pageable pageable);

    Optional<Product> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);

    boolean existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(String name, UUID id);

    boolean existsBySkuIgnoreCaseAndDeletedAtIsNull(String sku);

    boolean existsBySkuIgnoreCaseAndDeletedAtIsNullAndIdNot(String sku, UUID id);

    @Query(value = "SELECT nextval('product_sku_seq')", nativeQuery = true)
    long nextSkuSequenceValue();
}
