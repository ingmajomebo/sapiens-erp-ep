package com.sapiens.erp.modules.procurement.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ReceiveRequest(
        @NotNull @Size(min = 1) @Valid List<ReceiveLineRequest> lines,
        String notes
) {}
