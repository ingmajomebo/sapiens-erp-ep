package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalesOrderLinkRepository extends JpaRepository<SalesOrderLink, UUID> {

    List<SalesOrderLink> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    Optional<SalesOrderLink> findByIdAndDeletedAtIsNull(UUID id);

    Optional<SalesOrderLink> findByTokenAndDeletedAtIsNull(String token);
}
