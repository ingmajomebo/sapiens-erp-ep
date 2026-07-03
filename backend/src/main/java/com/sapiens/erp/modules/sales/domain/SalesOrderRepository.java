package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, UUID> {

    @Query("""
        SELECT so FROM SalesOrder so
        WHERE so.deletedAt IS NULL
          AND (:status IS NULL OR so.status = :status)
        ORDER BY so.createdAt DESC
        """)
    List<SalesOrder> findFiltered(@Param("status") SalesOrderStatus status);

    Optional<SalesOrder> findByIdAndDeletedAtIsNull(UUID id);

    @Query(value = "SELECT nextval('so_number_seq')", nativeQuery = true)
    long nextOrderNumberValue();
}
