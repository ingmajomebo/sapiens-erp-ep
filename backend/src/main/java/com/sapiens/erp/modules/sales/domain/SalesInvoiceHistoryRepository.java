package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SalesInvoiceHistoryRepository extends JpaRepository<SalesInvoiceHistory, UUID> {

    @Query("""
        SELECT h FROM SalesInvoiceHistory h
        WHERE h.deletedAt IS NULL AND h.invoice.id = :invoiceId
        ORDER BY h.changedAt DESC
        """)
    List<SalesInvoiceHistory> findByInvoiceId(@Param("invoiceId") UUID invoiceId);
}
