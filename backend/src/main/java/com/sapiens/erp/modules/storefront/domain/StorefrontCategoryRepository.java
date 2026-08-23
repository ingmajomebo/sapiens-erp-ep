package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StorefrontCategoryRepository extends JpaRepository<StorefrontCategory, UUID> {

    List<StorefrontCategory> findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc();

    Optional<StorefrontCategory> findBySlugAndPublishedTrueAndDeletedAtIsNull(String slug);

    Optional<StorefrontCategory> findBySlugAndDeletedAtIsNull(String slug);

    List<StorefrontCategory> findAllByParentSlugAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc(String parentSlug);
}
