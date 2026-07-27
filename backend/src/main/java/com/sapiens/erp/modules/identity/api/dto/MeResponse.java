package com.sapiens.erp.modules.identity.api.dto;

import java.util.List;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String name,
        String email,
        String role,
        List<String> permissions
) {}
