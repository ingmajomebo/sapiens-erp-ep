package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StorefrontAccountRepository extends JpaRepository<StorefrontAccount, UUID> {

    @EntityGraph(attributePaths = "customer")
    Optional<StorefrontAccount> findByEmailIgnoreCaseAndDeletedAtIsNull(String email);

    @EntityGraph(attributePaths = "customer")
    Optional<StorefrontAccount> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByEmailIgnoreCaseAndDeletedAtIsNull(String email);
}
