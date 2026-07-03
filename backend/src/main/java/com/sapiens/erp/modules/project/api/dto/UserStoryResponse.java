package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserStoryResponse(
        UUID id,
        String reqId,
        UUID epicId,
        String epicCode,
        String epicName,
        StoryType storyType,
        String persona,
        String actionStatement,
        String outcomeStatement,
        String description,
        String module,
        TaskPriority priority,
        StoryStatus status,
        StoryStatus previousStatus,
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
        Epic epic = s.getEpic();
        return new UserStoryResponse(
                s.getId(), s.getReqId(),
                epic != null ? epic.getId() : null,
                epic != null ? epic.getCode() : null,
                epic != null ? epic.getName() : null,
                s.getStoryType(),
                s.getPersona(), s.getActionStatement(), s.getOutcomeStatement(),
                s.getDescription(), s.getModule(), s.getPriority(), s.getStatus(),
                s.getPreviousStatus(),
                s.getNfrCategory(), s.getNfrCriterion(),
                scenarioDtos, s.getCreatedAt()
        );
    }
}
