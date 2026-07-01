package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.Sprint;
import com.sapiens.erp.modules.project.domain.SprintStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SprintResponse(
        UUID id,
        String name,
        String goal,
        LocalDate startDate,
        LocalDate endDate,
        SprintStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static SprintResponse from(Sprint s) {
        return new SprintResponse(
                s.getId(), s.getName(), s.getGoal(),
                s.getStartDate(), s.getEndDate(),
                s.getStatus(), s.getCreatedAt(), s.getUpdatedAt()
        );
    }
}
