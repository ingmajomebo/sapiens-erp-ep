package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StockResponse(
        UUID productId,
        String productName,
        UnitOfMeasure unitOfMeasure,
        BigDecimal currentStock,
        BigDecimal minimumStock,
        StockStatus stockStatus,
        List<WarehouseStock> warehouseStocks
) {
    public enum StockStatus { OK, LOW, CRITICAL, OUT_OF_STOCK }

    public record WarehouseStock(UUID warehouseId, String warehouseName, BigDecimal stock) {}

    public static StockResponse of(Product product, BigDecimal stock, List<WarehouseStock> warehouseStocks) {
        BigDecimal current = stock != null ? stock : BigDecimal.ZERO;
        BigDecimal minimum = product.getMinimumStock() != null ? product.getMinimumStock() : BigDecimal.ZERO;

        StockStatus status;
        if (current.compareTo(BigDecimal.ZERO) <= 0) {
            status = StockStatus.OUT_OF_STOCK;
        } else if (minimum.compareTo(BigDecimal.ZERO) > 0 && current.compareTo(minimum) <= 0) {
            status = StockStatus.CRITICAL;
        } else if (minimum.compareTo(BigDecimal.ZERO) > 0 && current.compareTo(minimum.multiply(new BigDecimal("1.5"))) <= 0) {
            status = StockStatus.LOW;
        } else {
            status = StockStatus.OK;
        }

        return new StockResponse(
                product.getId(),
                product.getName(),
                product.getUnitOfMeasure(),
                current,
                minimum,
                status,
                warehouseStocks != null ? warehouseStocks : List.of()
        );
    }
}
