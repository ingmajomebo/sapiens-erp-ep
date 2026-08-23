package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface StorefrontProductAttributeRepository
        extends JpaRepository<StorefrontProductAttribute, UUID> {

    List<StorefrontProductAttribute> findAllByProductIdIn(Collection<UUID> productIds);

    List<StorefrontProductAttribute> findAllByProductId(UUID productId);

    void deleteAllByProductId(UUID productId);
}
