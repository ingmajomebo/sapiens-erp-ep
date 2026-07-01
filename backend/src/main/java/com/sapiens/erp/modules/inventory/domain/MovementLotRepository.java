package com.sapiens.erp.modules.inventory.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovementLotRepository extends JpaRepository<MovementLot, UUID> {
    List<MovementLot> findByMovementId(UUID movementId);
}
