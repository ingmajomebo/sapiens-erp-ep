package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.PromptCategory;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record PromptPlanRequest(
        @NotBlank String title,
        String objective,
        String contextInfo,
        @NotBlank String promptContent,
        String module,
        PromptCategory category,
        UUID linkedTaskId
) {}
