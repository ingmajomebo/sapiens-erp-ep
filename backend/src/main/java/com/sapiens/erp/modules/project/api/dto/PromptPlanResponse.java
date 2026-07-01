package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.PromptCategory;
import com.sapiens.erp.modules.project.domain.PromptPlan;
import com.sapiens.erp.modules.project.domain.PromptStatus;

import java.time.Instant;
import java.util.UUID;

public record PromptPlanResponse(
        UUID id,
        String title,
        String objective,
        String contextInfo,
        String promptContent,
        String module,
        PromptCategory category,
        PromptStatus status,
        UUID linkedTaskId,
        String linkedTaskTitle,
        Short effectivenessRating,
        String executionNotes,
        Instant executedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static PromptPlanResponse from(PromptPlan p) {
        return new PromptPlanResponse(
                p.getId(), p.getTitle(), p.getObjective(),
                p.getContextInfo(), p.getPromptContent(),
                p.getModule(), p.getCategory(), p.getStatus(),
                p.getLinkedTask() != null ? p.getLinkedTask().getId() : null,
                p.getLinkedTask() != null ? p.getLinkedTask().getTitle() : null,
                p.getEffectivenessRating(), p.getExecutionNotes(), p.getExecutedAt(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
