package com.sapiens.erp.modules.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record RoleRequest(
        @NotBlank @Size(max = 50) String name,
        @Size(max = 200) String description,
        @NotNull List<UUID> permissionIds
) {}
