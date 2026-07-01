package com.sapiens.erp.modules.catalog.api.dto;

import com.sapiens.erp.modules.catalog.domain.ProductStatus;
import com.sapiens.erp.modules.catalog.domain.ProductType;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull UUID categoryId,
        @NotNull UnitOfMeasure unitOfMeasure,
        @DecimalMin("0") BigDecimal minimumStock,
        String description,
        String sku,
        String barcode,
        @NotNull ProductType productType,
        @DecimalMin("0") BigDecimal purchaseCost,
        @NotNull @DecimalMin("0") BigDecimal salePrice,
        Boolean inventoryTrackingEnabled,
        @NotBlank String defaultWarehouse,
        ProductStatus status,
        String imageUrl
) {}
