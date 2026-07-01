package com.sapiens.erp.modules.procurement.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String contactName,
        @Email @Size(max = 150) String email,
        @Size(max = 30) String phone,
        String address,
        @NotBlank @Size(max = 50) String taxId,
        String notes
) {}
