package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface SalesInvoicePaymentRepository extends JpaRepository<SalesInvoicePayment, UUID> {

    @Query("""
        SELECT p FROM SalesInvoicePayment p
        WHERE p.deletedAt IS NULL AND p.invoice.id = :invoiceId
        ORDER BY p.paidOn ASC, p.createdAt ASC
        """)
    List<SalesInvoicePayment> findByInvoiceId(@Param("invoiceId") UUID invoiceId);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM SalesInvoicePayment p
        WHERE p.deletedAt IS NULL AND p.invoice.id = :invoiceId
        """)
    BigDecimal sumByInvoiceId(@Param("invoiceId") UUID invoiceId);

    @Query("""
        SELECT p.invoice.id, COALESCE(SUM(p.amount), 0) FROM SalesInvoicePayment p
        WHERE p.deletedAt IS NULL AND p.invoice.id IN :invoiceIds
        GROUP BY p.invoice.id
        """)
    List<Object[]> sumByInvoiceIds(@Param("invoiceIds") List<UUID> invoiceIds);
}
