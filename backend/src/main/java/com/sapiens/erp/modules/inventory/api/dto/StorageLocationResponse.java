package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.catalog.domain.Warehouse;

import java.math.BigDecimal;
import java.util.UUID;

public record StorageLocationResponse(
        UUID id,
        String name,
        String description,
        boolean isDefault,
        boolean active,
        BigDecimal capacity,
        String capacityUnit
) {
    public static StorageLocationResponse from(Warehouse w) {
        return new StorageLocationResponse(
                w.getId(),
                w.getName(),
                w.getDescription(),
                w.isDefault(),
                w.isActive(),
                w.getCapacity(),
                w.getCapacityUnit()
        );
    }
}
