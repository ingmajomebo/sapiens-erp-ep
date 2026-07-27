package com.sapiens.erp.modules.inventory.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignLotLocationRequest(
        @NotNull UUID targetLocationId,
        @NotBlank String reason
) {}
