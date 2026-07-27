package com.sapiens.erp.modules.inventory.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {

    /** Current stock for a product across all locations. */
    @Query("""
            SELECT COALESCE(SUM(
                CASE WHEN m.movementType IN ('ENTRY', 'POSITIVE_ADJUSTMENT')       THEN  m.quantity
                     WHEN m.movementType IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT') THEN -m.quantity
                     ELSE 0
                END
            ), 0)
            FROM InventoryMovement m
            WHERE m.product.id = :productId
            """)
    BigDecimal calculateCurrentStock(@Param("productId") UUID productId);

    /** Stock for a product at a specific location using movement tracking. */
    @Query(value = """
            SELECT COALESCE(SUM(
                CASE
                  WHEN m.movement_type IN ('ENTRY','POSITIVE_ADJUSTMENT') AND m.to_location_id = :locationId THEN m.quantity
                  WHEN m.movement_type = 'TRANSFER'                       AND m.to_location_id = :locationId THEN m.quantity
                  WHEN m.movement_type IN ('EXIT','WASTE','NEGATIVE_ADJUSTMENT') AND m.from_location_id = :locationId THEN -m.quantity
                  WHEN m.movement_type = 'TRANSFER'                       AND m.from_location_id = :locationId THEN -m.quantity
                  ELSE 0
                END
            ), 0)
            FROM inventory_movements m
            WHERE m.product_id = :productId
            """, nativeQuery = true)
    BigDecimal calculateStockAtLocation(@Param("productId") UUID productId, @Param("locationId") UUID locationId);

    /** Total stock at a location across ALL products (for deletion safety check). */
    @Query(value = """
            SELECT COALESCE(SUM(delta), 0) FROM (
                SELECT  m.quantity AS delta FROM inventory_movements m
                  WHERE m.to_location_id   = :locationId AND m.movement_type IN ('ENTRY','POSITIVE_ADJUSTMENT','TRANSFER')
                UNION ALL
                SELECT -m.quantity         FROM inventory_movements m
                  WHERE m.from_location_id = :locationId AND m.movement_type IN ('EXIT','WASTE','NEGATIVE_ADJUSTMENT','TRANSFER')
            ) t
            """, nativeQuery = true)
    BigDecimal calculateTotalStockAtLocation(@Param("locationId") UUID locationId);

    /**
     * All locations with positive movement-based stock for a product.
     * Returns Object[]: [loc_id (UUID), loc_name (String), stock (BigDecimal)]
     */
    @Query(value = """
            SELECT loc_id, loc_name, SUM(qty) AS stock
            FROM (
                SELECT m.to_location_id   AS loc_id, w.name AS loc_name,  m.quantity AS qty
                FROM inventory_movements m JOIN warehouses w ON w.id = m.to_location_id
                WHERE m.product_id = :productId
                  AND m.movement_type IN ('ENTRY','POSITIVE_ADJUSTMENT') AND m.to_location_id IS NOT NULL
                UNION ALL
                SELECT m.to_location_id, w.name, m.quantity
                FROM inventory_movements m JOIN warehouses w ON w.id = m.to_location_id
                WHERE m.product_id = :productId
                  AND m.movement_type = 'TRANSFER' AND m.to_location_id IS NOT NULL
                UNION ALL
                SELECT m.from_location_id, w.name, -m.quantity
                FROM inventory_movements m JOIN warehouses w ON w.id = m.from_location_id
                WHERE m.product_id = :productId
                  AND m.movement_type IN ('EXIT','WASTE','NEGATIVE_ADJUSTMENT') AND m.from_location_id IS NOT NULL
                UNION ALL
                SELECT m.from_location_id, w.name, -m.quantity
                FROM inventory_movements m JOIN warehouses w ON w.id = m.from_location_id
                WHERE m.product_id = :productId
                  AND m.movement_type = 'TRANSFER' AND m.from_location_id IS NOT NULL
            ) t
            GROUP BY loc_id, loc_name
            HAVING SUM(qty) > 0
            ORDER BY loc_name
            """, nativeQuery = true)
    List<Object[]> stockAllLocations(@Param("productId") UUID productId);

    Page<InventoryMovement> findByProductIdOrderByCreatedAtDesc(UUID productId, Pageable pageable);

    Page<InventoryMovement> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<InventoryMovement> findByMovementTypeOrderByCreatedAtDesc(MovementType movementType, Pageable pageable);

    /** Total stock stored in products assigned to a given warehouse (by name). */
    @Query("""
            SELECT COALESCE(SUM(
                CASE WHEN m.movementType IN ('ENTRY', 'POSITIVE_ADJUSTMENT')       THEN  m.quantity
                     WHEN m.movementType IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT') THEN -m.quantity
                     ELSE 0
                END
            ), 0)
            FROM InventoryMovement m
            WHERE m.product.defaultWarehouse = :warehouseName
              AND m.product.deletedAt IS NULL
            """)
    BigDecimal calculateStockByWarehouseName(@Param("warehouseName") String warehouseName);
}
