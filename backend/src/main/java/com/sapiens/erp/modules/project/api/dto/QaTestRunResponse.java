package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record QaTestRunResponse(
        UUID id,
        String code,
        String name,
        RunType runType,
        String buildVersion,
        RunEnvironment environment,
        RunStatus status,
        TaskAssignee openedBy,
        Instant closedAt,
        String notes,
        UUID sprintId,
        String sprintName,
        Map<String, Object> summary,
        long totalItems,
        Instant createdAt
) {
    public static QaTestRunResponse from(QaTestRun r, long totalItems) {
        return new QaTestRunResponse(
                r.getId(), r.getCode(), r.getName(), r.getRunType(),
                r.getBuildVersion(), r.getEnvironment(), r.getStatus(),
                r.getOpenedBy(), r.getClosedAt(), r.getNotes(),
                r.getSprint() != null ? r.getSprint().getId() : null,
                r.getSprint() != null ? r.getSprint().getName() : null,
                r.getSummary(), totalItems, r.getCreatedAt()
        );
    }
}
