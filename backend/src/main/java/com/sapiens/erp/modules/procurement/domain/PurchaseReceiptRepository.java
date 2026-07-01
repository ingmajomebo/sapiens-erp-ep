package com.sapiens.erp.modules.procurement.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PurchaseReceiptRepository extends JpaRepository<PurchaseReceipt, UUID> {

    @Query("""
            SELECT r FROM PurchaseReceipt r
            JOIN FETCH r.lines rl
            JOIN FETCH rl.product
            WHERE r.purchaseOrder.id = :poId
              AND r.deletedAt IS NULL
            """)
    Optional<PurchaseReceipt> findByPurchaseOrderId(UUID poId);
}
