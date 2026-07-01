package com.sapiens.erp.modules.inventory.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.UUID;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {

    /** Current stock for a product: sum of entries minus exits. */
    @Query("""
            SELECT COALESCE(SUM(
                CASE WHEN m.movementType IN ('ENTRY', 'POSITIVE_ADJUSTMENT')  THEN  m.quantity
                     WHEN m.movementType IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT') THEN -m.quantity
                END
            ), 0)
            FROM InventoryMovement m
            WHERE m.product.id = :productId
            """)
    BigDecimal calculateCurrentStock(@Param("productId") UUID productId);

    Page<InventoryMovement> findByProductIdOrderByCreatedAtDesc(UUID productId, Pageable pageable);

    Page<InventoryMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
