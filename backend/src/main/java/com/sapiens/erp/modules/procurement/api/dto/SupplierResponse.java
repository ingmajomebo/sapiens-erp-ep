package com.sapiens.erp.modules.procurement.api.dto;

import com.sapiens.erp.modules.procurement.domain.Supplier;

import java.time.Instant;
import java.util.UUID;

public record SupplierResponse(
        UUID id,
        String name,
        String contactName,
        String email,
        String phone,
        String address,
        String taxId,
        String notes,
        boolean active,
        Instant createdAt
) {
    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(
                s.getId(),
                s.getName(),
                s.getContactName(),
                s.getEmail(),
                s.getPhone(),
                s.getAddress(),
                s.getTaxId(),
                s.getNotes(),
                s.isActive(),
                s.getCreatedAt()
        );
    }
}
