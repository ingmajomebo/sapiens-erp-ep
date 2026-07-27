package com.sapiens.erp.modules.identity.api.dto;

import java.util.List;
import java.util.UUID;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        UUID userId,
        String name,
        String role,
        List<String> permissions
) {}
