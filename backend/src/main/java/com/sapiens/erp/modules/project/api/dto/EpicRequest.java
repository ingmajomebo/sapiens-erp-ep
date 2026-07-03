package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.EpicStatus;
import com.sapiens.erp.modules.project.domain.TaskPriority;
import jakarta.validation.constraints.NotBlank;

public record EpicRequest(
        String code,
        @NotBlank String name,
        String objective,
        String successCriteria,
        String module,
        TaskPriority priority,
        EpicStatus status
) {}
