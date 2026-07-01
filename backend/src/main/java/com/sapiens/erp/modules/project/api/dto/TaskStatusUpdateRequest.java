package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record TaskStatusUpdateRequest(@NotNull TaskStatus status) {}
