package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
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

    /**
     * Unidades vendidas por producto, de más a menos, desde una fecha.
     *
     * <p>Cuenta sobre FACTURAS, no sobre pedidos: un pedido puede quedarse sin
     * despachar y no es una venta. Se excluyen los borradores —todavía no son
     * un documento— y las canceladas, porque una venta anulada no es una venta.
     *
     * <p>Suma cantidades y no importes a propósito: lo que le interesa a quien
     * compra es qué se lleva la gente, y ordenar por dinero pondría arriba lo
     * caro en vez de lo popular.
     */
    @Query("""
        SELECT l.product.id, SUM(l.quantity)
        FROM SalesInvoiceLine l
        WHERE l.invoice.deletedAt IS NULL
          AND l.deletedAt IS NULL
          AND l.invoice.status IN (
                com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.ISSUED,
                com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.PARTIALLY_PAID,
                com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.PAID)
          AND l.invoice.issuedAt >= :desde
          AND l.product IS NOT NULL
        GROUP BY l.product.id
        ORDER BY SUM(l.quantity) DESC
        """)
    List<Object[]> findUnitsSoldByProductSince(@Param("desde") Instant desde);

    /** Filtros combinables (texto, estados, fechas, cliente, montos, solo vencidas) con paginación. */
    @Query("""
        SELECT i FROM SalesInvoice i
        LEFT JOIN i.customer c
        WHERE i.deletedAt IS NULL
          AND (:statuses IS NULL OR i.status IN :statuses)
          AND (:customerId IS NULL OR c.id = :customerId)
          AND (CAST(:fromDate AS timestamp) IS NULL OR i.issuedAt >= :fromDate)
          AND (CAST(:toDate AS timestamp) IS NULL OR i.issuedAt < :toDate)
          AND (:minTotal IS NULL OR i.total >= :minTotal)
          AND (:maxTotal IS NULL OR i.total <= :maxTotal)
          AND (:overdueOnly = false OR (i.dueDate < CURRENT_DATE
               AND (i.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.ISSUED
                    OR i.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.PARTIALLY_PAID)))
          AND (:q IS NULL OR LOWER(i.invoiceNumber) LIKE :q
               OR LOWER(i.salesOrder.orderNumber) LIKE :q
               OR LOWER(COALESCE(c.name, '')) LIKE :q)
        """)
    Page<SalesInvoice> search(@Param("q") String q,
                              @Param("statuses") List<SalesInvoiceStatus> statuses,
                              @Param("customerId") UUID customerId,
                              @Param("fromDate") Instant fromDate,
                              @Param("toDate") Instant toDate,
                              @Param("minTotal") BigDecimal minTotal,
                              @Param("maxTotal") BigDecimal maxTotal,
                              @Param("overdueOnly") boolean overdueOnly,
                              Pageable pageable);

    @Query("""
        SELECT i FROM SalesInvoice i
        WHERE i.deletedAt IS NULL
          AND i.salesOrder.id IN :orderIds
          AND i.status <> com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.CANCELLED
        """)
    List<SalesInvoice> findActiveByOrderIds(@Param("orderIds") List<UUID> orderIds);

    @Query(value = "SELECT nextval('sales_invoice_number_seq')", nativeQuery = true)
    long nextInvoiceNumberValue();

    /** Total facturado por cliente (excluye borradores y canceladas). */
    @Query("""
        SELECT i.customer.id, COALESCE(SUM(i.total), 0)
        FROM SalesInvoice i
        WHERE i.deletedAt IS NULL AND i.customer IS NOT NULL
          AND i.status <> com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.DRAFT
          AND i.status <> com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.CANCELLED
        GROUP BY i.customer.id
        """)
    List<Object[]> invoicedTotalsByCustomer();

    /** Total de facturas abiertas (emitidas o con pago parcial) por cliente. */
    @Query("""
        SELECT i.customer.id, COALESCE(SUM(i.total), 0)
        FROM SalesInvoice i
        WHERE i.deletedAt IS NULL AND i.customer IS NOT NULL
          AND (i.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.ISSUED
               OR i.status = com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus.PARTIALLY_PAID)
        GROUP BY i.customer.id
        """)
    List<Object[]> openTotalsByCustomer();

    @Query("""
        SELECT i FROM SalesInvoice i
        WHERE i.deletedAt IS NULL AND i.customer.id = :customerId
        ORDER BY i.createdAt DESC
        """)
    List<SalesInvoice> findByCustomerId(@Param("customerId") UUID customerId);
}
