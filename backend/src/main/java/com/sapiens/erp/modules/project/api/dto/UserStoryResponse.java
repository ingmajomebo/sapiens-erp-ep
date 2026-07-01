package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserStoryResponse(
        UUID id,
        String reqId,
        String epic,
        StoryType storyType,
        String persona,
        String actionStatement,
        String outcomeStatement,
        String description,
        String module,
        TaskPriority priority,
        StoryStatus status,
        NfrCategory nfrCategory,
        String nfrCriterion,
        List<StoryScenarioResponse> scenarios,
        Instant createdAt
) {
    public static UserStoryResponse from(UserStory s) {
        List<StoryScenarioResponse> scenarioDtos = s.getScenarios().stream()
                .filter(sc -> sc.getDeletedAt() == null)
                .map(StoryScenarioResponse::from)
                .toList();
        return new UserStoryResponse(
                s.getId(), s.getReqId(), s.getEpic(), s.getStoryType(),
                s.getPersona(), s.getActionStatement(), s.getOutcomeStatement(),
                s.getDescription(), s.getModule(), s.getPriority(), s.getStatus(),
                s.getNfrCategory(), s.getNfrCriterion(),
                scenarioDtos, s.getCreatedAt()
        );
    }
}
