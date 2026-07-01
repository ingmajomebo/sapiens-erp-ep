package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.NfrCategory;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import com.sapiens.erp.modules.project.domain.StoryType;
import com.sapiens.erp.modules.project.domain.TaskPriority;
import jakarta.validation.constraints.NotBlank;

public record UserStoryRequest(
        @NotBlank String reqId,
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
        String nfrCriterion
) {}
