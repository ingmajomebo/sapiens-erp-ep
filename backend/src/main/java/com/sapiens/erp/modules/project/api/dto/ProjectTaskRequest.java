package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TaskPriority;
import com.sapiens.erp.modules.project.domain.TaskType;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record ProjectTaskRequest(
        @NotBlank String title,
        String description,
        TaskType taskType,
        TaskAssignee assignee,
        TaskPriority priority,
        UUID sprintId,
        String module,
        String linkedRequirementId,
        Integer estimatedHours,
        String notes
) {}
