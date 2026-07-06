package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ReceiptApplicationRepository extends JpaRepository<ReceiptApplication, UUID> {

    /** Aplicaciones sobre una CxC, recibos activos primero por fecha. */
    @Query("""
        SELECT a FROM ReceiptApplication a
        JOIN FETCH a.receipt r
        WHERE a.receivable.id = :receivableId
        ORDER BY r.receiptDate DESC
        """)
    List<ReceiptApplication> findByReceivableId(@Param("receivableId") UUID receivableId);
}
