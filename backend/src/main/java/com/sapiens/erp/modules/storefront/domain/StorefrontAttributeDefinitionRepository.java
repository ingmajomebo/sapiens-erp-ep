package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorefrontAttributeDefinitionRepository
        extends JpaRepository<StorefrontAttributeDefinition, String> {

    List<StorefrontAttributeDefinition> findAllByOrderBySortOrderAscLabelAsc();
}
