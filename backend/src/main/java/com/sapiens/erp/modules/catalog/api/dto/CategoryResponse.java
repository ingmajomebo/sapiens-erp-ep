package com.sapiens.erp.modules.catalog.api.dto;

import com.sapiens.erp.modules.catalog.domain.Category;

import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        String description
) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription());
    }
}
