package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StorefrontProductRepository extends JpaRepository<StorefrontProduct, UUID> {

    // El catálogo se sirve fuera de transacción de vista: el producto tiene que
    // venir en la misma consulta o el proxy perezoso no se puede resolver.
    @EntityGraph(attributePaths = { "product", "product.category" })
    List<StorefrontProduct> findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscGroupNameAsc();

    @EntityGraph(attributePaths = { "product", "product.category" })
    Optional<StorefrontProduct> findBySlugAndDeletedAtIsNull(String slug);

    @EntityGraph(attributePaths = { "product", "product.category" })
    List<StorefrontProduct> findAllByGroupSlugAndPublishedTrueAndDeletedAtIsNull(String groupSlug);
}
