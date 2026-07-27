package com.sapiens.erp.modules.inventory.application;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Corrects missing warehouse_id on lots and their originating ENTRY movements.
 * Uses JdbcTemplate to temporarily bypass the no_update_inventory_movements rule,
 * because this is a one-time historical data fix, not a recurring operation.
 */
@Service
@RequiredArgsConstructor
public class LotLocationCorrectionService {

    private final JdbcTemplate jdbc;

    @Transactional
    public int correctLotAndMovement(UUID lotId, UUID locationId, UUID productId, String invoiceNumber) {
        // 1. Update the lot
        jdbc.update("UPDATE lots SET warehouse_id = ? WHERE id = ? AND warehouse_id IS NULL",
                locationId, lotId);

        // 2. Temporarily lift the immutability rule, update the ENTRY movement, restore
        jdbc.execute("DROP RULE IF EXISTS no_update_inventory_movements ON inventory_movements");

        int updated = jdbc.update(
                "UPDATE inventory_movements SET to_location_id = ? " +
                "WHERE product_id = ? AND movement_type = 'ENTRY' AND to_location_id IS NULL " +
                "AND notes = ?",
                locationId, productId, "Recepción OC " + invoiceNumber);

        jdbc.execute(
                "CREATE RULE no_update_inventory_movements AS " +
                "ON UPDATE TO inventory_movements DO INSTEAD NOTHING");

        return updated;
    }
}
