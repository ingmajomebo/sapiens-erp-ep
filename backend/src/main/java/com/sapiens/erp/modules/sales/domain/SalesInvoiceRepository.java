package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, UUID> {

    @Query("""
        SELECT i FROM SalesInvoice i
        WHERE i.deletedAt IS NULL
          AND (:status IS NULL OR i.status = :status)
        ORDER BY i.issuedAt DESC
        """)
    List<SalesInvoice> findFiltered(@Param("status") SalesInvoiceStatus status);

    Optional<SalesInvoice> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
        SELECT i FROM SalesInvoice i
        WHERE i.deletedAt IS NULL
          AND i.salesOrder.id IN :orderIds
          AND i.status <> com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.CANCELLED
        """)
    List<SalesInvoice> findActiveByOrderIds(@Param("orderIds") List<UUID> orderIds);

    @Query(value = "SELECT nextval('sales_invoice_number_seq')", nativeQuery = true)
    long nextInvoiceNumberValue();
}
