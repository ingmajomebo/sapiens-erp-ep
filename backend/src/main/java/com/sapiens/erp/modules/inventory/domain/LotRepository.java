package com.sapiens.erp.modules.inventory.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface LotRepository extends JpaRepository<Lot, UUID> {

    /** Lots with remaining stock for a product, oldest first (FIFO, location-agnostic). */
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

    /** Quantity still available in a specific lot (global, across all locations). */
    @Query("""
            SELECT l.quantity - COALESCE(SUM(ml.quantity), 0)
            FROM Lot l LEFT JOIN MovementLot ml ON ml.lot.id = l.id
            WHERE l.id = :lotId
            GROUP BY l.quantity
            """)
    BigDecimal calculateAvailableQuantity(@Param("lotId") UUID lotId);

    /**
     * Lots with available quantity at a specific location, oldest first (FIFO).
     * Returns Object[]: [lot_id (UUID), received_at, created_at, available_at_location (BigDecimal)]
     */
    @Query(value = """
            SELECT q.id, q.received_at, q.created_at, q.available_at_location
            FROM (
                SELECT l.id, l.received_at, l.created_at,
                  GREATEST(0,
                    CASE WHEN l.warehouse_id = :locationId THEN l.quantity ELSE 0 END
                    + COALESCE((
                        SELECT SUM(ml.quantity) FROM movement_lots ml
                        JOIN inventory_movements im ON im.id = ml.movement_id
                        WHERE ml.lot_id = l.id AND im.movement_type = 'TRANSFER' AND im.to_location_id = :locationId
                      ), 0)
                    - COALESCE((
                        SELECT SUM(ml.quantity) FROM movement_lots ml
                        JOIN inventory_movements im ON im.id = ml.movement_id
                        WHERE ml.lot_id = l.id AND im.movement_type = 'TRANSFER' AND im.from_location_id = :locationId
                      ), 0)
                    - COALESCE((
                        SELECT SUM(ml.quantity) FROM movement_lots ml
                        JOIN inventory_movements im ON im.id = ml.movement_id
                        WHERE ml.lot_id = l.id
                          AND im.movement_type IN ('EXIT','WASTE','NEGATIVE_ADJUSTMENT')
                          AND im.from_location_id = :locationId
                      ), 0)
                  ) AS available_at_location
                FROM lots l
                WHERE l.product_id = :productId
            ) q
            WHERE q.available_at_location > 0
            ORDER BY q.received_at ASC, q.created_at ASC
            """, nativeQuery = true)
    List<Object[]> findAvailableByProductAndLocationFIFO(@Param("productId") UUID productId,
                                                         @Param("locationId") UUID locationId);

    /** Available quantity for a specific lot at a specific location. */
    @Query(value = """
            SELECT GREATEST(0,
                CASE WHEN l.warehouse_id = :locationId THEN l.quantity ELSE 0 END
                + COALESCE((
                    SELECT SUM(ml.quantity) FROM movement_lots ml
                    JOIN inventory_movements im ON im.id = ml.movement_id
                    WHERE ml.lot_id = :lotId AND im.movement_type = 'TRANSFER' AND im.to_location_id = :locationId
                  ), 0)
                - COALESCE((
                    SELECT SUM(ml.quantity) FROM movement_lots ml
                    JOIN inventory_movements im ON im.id = ml.movement_id
                    WHERE ml.lot_id = :lotId AND im.movement_type = 'TRANSFER' AND im.from_location_id = :locationId
                  ), 0)
                - COALESCE((
                    SELECT SUM(ml.quantity) FROM movement_lots ml
                    JOIN inventory_movements im ON im.id = ml.movement_id
                    WHERE ml.lot_id = :lotId
                      AND im.movement_type IN ('EXIT','WASTE','NEGATIVE_ADJUSTMENT')
                      AND im.from_location_id = :locationId
                  ), 0)
              )
            FROM lots l WHERE l.id = :lotId
            """, nativeQuery = true)
    BigDecimal calculateAvailableAtLocation(@Param("lotId") UUID lotId, @Param("locationId") UUID locationId);

    /** Available stock per warehouse for a product (lot-based, legacy). */
    @Query(value = """
            SELECT w.id        AS warehouseId,
                   w.name      AS warehouseName,
                   SUM(l.quantity - COALESCE(consumed.qty, 0)) AS stock
            FROM lots l
            JOIN warehouses w ON w.id = l.warehouse_id
            LEFT JOIN (
                SELECT lot_id, SUM(quantity) AS qty
                FROM movement_lots
                GROUP BY lot_id
            ) consumed ON consumed.lot_id = l.id
            WHERE l.product_id = :productId
              AND l.warehouse_id IS NOT NULL
            GROUP BY w.id, w.name
            HAVING SUM(l.quantity - COALESCE(consumed.qty, 0)) > 0
            ORDER BY w.name
            """, nativeQuery = true)
    List<Object[]> stockByWarehouse(@Param("productId") UUID productId);

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
