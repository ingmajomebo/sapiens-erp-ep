package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountsReceivableRepository extends JpaRepository<AccountsReceivable, UUID> {

    Optional<AccountsReceivable> findByInvoiceId(UUID invoiceId);

    /**
     * Lista filtrada. dueFrom/dueTo acotan el bucket de antigüedad (calculado en el service);
     * openOnly restringe a cartera abierta cuando se filtra por bucket.
     */
    @Query("""
        SELECT ar FROM AccountsReceivable ar
        WHERE (:customerId IS NULL OR ar.customerId = :customerId)
          AND (:status IS NULL OR ar.status = :status)
          AND (CAST(:dueFrom AS date) IS NULL OR ar.dueDate >= :dueFrom)
          AND (CAST(:dueTo AS date) IS NULL OR ar.dueDate <= :dueTo)
          AND (:openOnly = false OR ar.status IN (
                com.sapiens.erp.modules.finance.domain.ReceivableStatus.PENDING,
                com.sapiens.erp.modules.finance.domain.ReceivableStatus.PARTIALLY_PAID))
        ORDER BY ar.dueDate ASC, ar.createdAt ASC
        """)
    Page<AccountsReceivable> findFiltered(@Param("customerId") UUID customerId,
                                          @Param("status") ReceivableStatus status,
                                          @Param("dueFrom") java.time.LocalDate dueFrom,
                                          @Param("dueTo") java.time.LocalDate dueTo,
                                          @Param("openOnly") boolean openOnly,
                                          Pageable pageable);

    /** Cartera abierta (para aging, KPIs y distribución FIFO), la más antigua primero. */
    @Query("""
        SELECT ar FROM AccountsReceivable ar
        WHERE ar.status IN (com.sapiens.erp.modules.finance.domain.ReceivableStatus.PENDING,
                            com.sapiens.erp.modules.finance.domain.ReceivableStatus.PARTIALLY_PAID)
          AND (:customerId IS NULL OR ar.customerId = :customerId)
        ORDER BY ar.dueDate ASC, ar.createdAt ASC
        """)
    List<AccountsReceivable> findOpen(@Param("customerId") UUID customerId);
}
