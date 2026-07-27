package com.sapiens.erp.modules.identity.api.dto;

import java.util.UUID;

public record PermissionDto(
        UUID id,
        String code,
        String description,
        String module
) {}
