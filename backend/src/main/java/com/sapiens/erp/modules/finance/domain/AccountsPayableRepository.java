package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountsPayableRepository extends JpaRepository<AccountsPayable, UUID> {

    @Query("""
            SELECT ap FROM AccountsPayable ap
            JOIN FETCH ap.supplier
            JOIN FETCH ap.purchaseOrder
            WHERE ap.deletedAt IS NULL
            ORDER BY ap.createdAt DESC
            """)
    List<AccountsPayable> findAllActive();

    @Query("""
            SELECT ap FROM AccountsPayable ap
            JOIN FETCH ap.supplier
            JOIN FETCH ap.purchaseOrder
            WHERE ap.status IN ('PENDING', 'PARTIALLY_PAID')
              AND ap.deletedAt IS NULL
            ORDER BY ap.dueDate ASC NULLS LAST, ap.createdAt ASC
            """)
    List<AccountsPayable> findAllPending();

    @Query("""
            SELECT ap FROM AccountsPayable ap
            JOIN FETCH ap.supplier
            JOIN FETCH ap.purchaseOrder
            WHERE ap.purchaseOrder.id = :purchaseOrderId
              AND ap.deletedAt IS NULL
            """)
    Optional<AccountsPayable> findByPurchaseOrderId(UUID purchaseOrderId);

    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    long nextInvoiceNumber();
}
