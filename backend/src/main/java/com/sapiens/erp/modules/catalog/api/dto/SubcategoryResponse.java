package com.sapiens.erp.modules.catalog.api.dto;

import com.sapiens.erp.modules.catalog.domain.Subcategory;

import java.util.UUID;

public record SubcategoryResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String name,
        String description
) {
    public static SubcategoryResponse from(Subcategory s) {
        return new SubcategoryResponse(
                s.getId(),
                s.getCategory().getId(),
                s.getCategory().getName(),
                s.getName(),
                s.getDescription()
        );
    }
}
