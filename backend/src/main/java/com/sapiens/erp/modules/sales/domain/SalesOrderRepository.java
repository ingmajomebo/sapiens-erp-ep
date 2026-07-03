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

    /** Estadísticas de compra por cliente: total pedidos, primera y última compra (excluye cancelados). */
    @Query("""
        SELECT so.customer.id, COUNT(so), MIN(so.createdAt), MAX(so.createdAt)
        FROM SalesOrder so
        WHERE so.deletedAt IS NULL
          AND so.customer IS NOT NULL
          AND so.status <> com.sapiens.erp.modules.sales.domain.SalesOrderStatus.CANCELLED
        GROUP BY so.customer.id
        """)
    List<Object[]> purchaseStatsByCustomer();

    @Query("""
        SELECT so FROM SalesOrder so
        WHERE so.deletedAt IS NULL AND so.customer.id = :customerId
        ORDER BY so.createdAt DESC
        """)
    List<SalesOrder> findByCustomerId(@Param("customerId") UUID customerId);
}
