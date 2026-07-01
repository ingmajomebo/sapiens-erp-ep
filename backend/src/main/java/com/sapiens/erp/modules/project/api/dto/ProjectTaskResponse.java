package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.*;

import java.time.Instant;
import java.util.UUID;

public record ProjectTaskResponse(
        UUID id,
        String title,
        String description,
        TaskType taskType,
        TaskStatus status,
        TaskAssignee assignee,
        TaskPriority priority,
        UUID sprintId,
        String sprintName,
        String module,
        String linkedRequirementId,
        Integer estimatedHours,
        Integer actualHours,
        String notes,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectTaskResponse from(ProjectTask t) {
        return new ProjectTaskResponse(
                t.getId(), t.getTitle(), t.getDescription(),
                t.getTaskType(), t.getStatus(), t.getAssignee(), t.getPriority(),
                t.getSprint() != null ? t.getSprint().getId() : null,
                t.getSprint() != null ? t.getSprint().getName() : null,
                t.getModule(), t.getLinkedRequirementId(),
                t.getEstimatedHours(), t.getActualHours(),
                t.getNotes(), t.getCompletedAt(),
                t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
