package com.sapiens.erp.modules.catalog.api.dto;

import com.sapiens.erp.modules.catalog.domain.Warehouse;

import java.math.BigDecimal;
import java.util.UUID;

public record WarehouseResponse(
        UUID id,
        String name,
        BigDecimal capacity,
        String capacityUnit,
        String description,
        boolean active,
        boolean isDefault,
        BigDecimal currentStock
) {
    public static WarehouseResponse from(Warehouse w, BigDecimal currentStock) {
        return new WarehouseResponse(
                w.getId(), w.getName(), w.getCapacity(), w.getCapacityUnit(),
                w.getDescription(), w.isActive(), w.isDefault(), currentStock
        );
    }
}
