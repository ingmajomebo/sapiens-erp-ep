package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.Epic;
import com.sapiens.erp.modules.project.domain.EpicStatus;
import com.sapiens.erp.modules.project.domain.TaskPriority;

import java.time.Instant;
import java.util.UUID;

public record EpicResponse(
        UUID id,
        String code,
        String name,
        String objective,
        String successCriteria,
        String module,
        TaskPriority priority,
        EpicStatus status,
        long totalStories,
        long doneStories,
        Instant createdAt
) {
    public static EpicResponse from(Epic e, long totalStories, long doneStories) {
        return new EpicResponse(
                e.getId(), e.getCode(), e.getName(), e.getObjective(),
                e.getSuccessCriteria(), e.getModule(), e.getPriority(), e.getStatus(),
                totalStories, doneStories, e.getCreatedAt()
        );
    }
}
