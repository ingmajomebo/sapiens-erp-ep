package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.ScenarioType;
import jakarta.validation.constraints.NotBlank;

public record StoryScenarioRequest(
        @NotBlank String scenarioTitle,
        @NotBlank String givenConditions,
        @NotBlank String whenEvent,
        @NotBlank String thenOutcome,
        ScenarioType scenarioType,
        Integer sortOrder
) {}
