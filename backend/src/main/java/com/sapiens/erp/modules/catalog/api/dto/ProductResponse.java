package com.sapiens.erp.modules.catalog.api.dto;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductStatus;
import com.sapiens.erp.modules.catalog.domain.ProductType;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String name,
        UUID categoryId,
        String categoryName,
        UnitOfMeasure unitOfMeasure,
        BigDecimal minimumStock,
        BigDecimal currentStock,
        String description,
        boolean active,
        String sku,
        String barcode,
        ProductType productType,
        BigDecimal purchaseCost,
        BigDecimal purchaseCostLast,
        BigDecimal averageCost,
        BigDecimal salePrice,
        boolean inventoryTrackingEnabled,
        String defaultWarehouse,
        UUID warehouseId,
        String warehouseName,
        ProductStatus status,
        String imageUrl,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getName(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getUnitOfMeasure(),
                p.getMinimumStock(),
                BigDecimal.ZERO,
                p.getDescription(),
                p.isActive(),
                p.getSku(),
                p.getBarcode(),
                p.getProductType(),
                p.getPurchaseCost(),
                p.getPurchaseCostLast(),
                p.getAverageCost(),
                p.getSalePrice(),
                p.isInventoryTrackingEnabled(),
                p.getDefaultWarehouse(),
                p.getWarehouse() != null ? p.getWarehouse().getId() : null,
                p.getWarehouse() != null ? p.getWarehouse().getName() : p.getDefaultWarehouse(),
                p.getStatus(),
                p.getImageUrl(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
