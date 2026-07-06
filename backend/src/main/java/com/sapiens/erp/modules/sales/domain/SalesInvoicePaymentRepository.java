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

    /** Pagos activos de una factura con una referencia dada (espejo de un recibo de caja). */
    @Query("""
        SELECT p FROM SalesInvoicePayment p
        WHERE p.deletedAt IS NULL AND p.invoice.id = :invoiceId AND p.reference = :reference
        """)
    List<SalesInvoicePayment> findActiveByInvoiceIdAndReference(@Param("invoiceId") UUID invoiceId,
                                                                @Param("reference") String reference);

    /** Pagos aplicados a facturas abiertas, agrupados por cliente (para saldo pendiente). */
    @Query("""
        SELECT p.invoice.customer.id, COALESCE(SUM(p.amount), 0) FROM SalesInvoicePayment p
        WHERE p.deletedAt IS NULL AND p.invoice.customer IS NOT NULL
          AND (p.invoice.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.ISSUED
               OR p.invoice.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.PARTIALLY_PAID)
        GROUP BY p.invoice.customer.id
        """)
    List<Object[]> openPaymentsByCustomer();
}
