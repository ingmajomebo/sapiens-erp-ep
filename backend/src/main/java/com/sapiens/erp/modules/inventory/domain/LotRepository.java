package com.sapiens.erp.modules.inventory.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface LotRepository extends JpaRepository<Lot, UUID> {

    /** Lots with remaining stock for a product, oldest first (FIFO). */
    @Query("""
            SELECT l FROM Lot l
            WHERE l.product.id = :productId
              AND l.quantity > (
                  SELECT COALESCE(SUM(ml.quantity), 0)
                  FROM MovementLot ml WHERE ml.lot.id = l.id
              )
            ORDER BY l.receivedAt ASC, l.createdAt ASC
            """)
    List<Lot> findAvailableByProductFIFO(@Param("productId") UUID productId);

    /** All lots for a product, newest first (for display). */
    List<Lot> findByProductIdOrderByReceivedAtDesc(UUID productId);

    /** Quantity still available in a specific lot. */
    @Query("""
            SELECT l.quantity - COALESCE(SUM(ml.quantity), 0)
            FROM Lot l LEFT JOIN MovementLot ml ON ml.lot.id = l.id
            WHERE l.id = :lotId
            GROUP BY l.quantity
            """)
    BigDecimal calculateAvailableQuantity(@Param("lotId") UUID lotId);

    /** Lots expiring on or before threshold, for products not deleted. */
    @Query("""
            SELECT l FROM Lot l JOIN FETCH l.product p
            WHERE l.expiresAt IS NOT NULL
              AND l.expiresAt <= :threshold
              AND p.deletedAt IS NULL
            ORDER BY l.expiresAt ASC
            """)
    List<Lot> findExpiringLots(@Param("threshold") java.time.LocalDate threshold);
}
