package com.sapiens.erp.modules.catalog.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record WarehouseRequest(
        @NotBlank @Size(max = 100) String name,
        BigDecimal capacity,
        String capacityUnit,
        String description
) {}
