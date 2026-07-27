package com.sapiens.erp.modules.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record StorageLocationRequest(
        @NotBlank @Size(max = 100) String name,
        String description,
        boolean isDefault,
        BigDecimal capacity,
        String capacityUnit
) {}
