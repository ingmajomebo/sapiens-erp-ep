package com.sapiens.erp.modules.identity.api.dto;

import java.util.List;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        String description,
        boolean system,
        List<String> permissionCodes,
        long userCount
) {}
