package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.ScenarioType;
import com.sapiens.erp.modules.project.domain.StoryScenario;

import java.util.UUID;

public record StoryScenarioResponse(
        UUID id,
        String scenarioTitle,
        String givenConditions,
        String whenEvent,
        String thenOutcome,
        ScenarioType scenarioType,
        Integer sortOrder
) {
    public static StoryScenarioResponse from(StoryScenario s) {
        return new StoryScenarioResponse(
                s.getId(), s.getScenarioTitle(),
                s.getGivenConditions(), s.getWhenEvent(), s.getThenOutcome(),
                s.getScenarioType(), s.getSortOrder()
        );
    }
}
