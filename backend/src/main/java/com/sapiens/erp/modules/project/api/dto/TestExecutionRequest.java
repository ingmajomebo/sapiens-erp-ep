package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.RunEnvironment;
import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TestResult;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TestExecutionRequest(
        @NotNull TestResult result,
        TaskAssignee executedBy,
        String notes,
        Boolean createDefect,
        String defectTitle,
        TaskAssignee defectAssignee,
        UUID testRunId,
        String buildVersion,
        RunEnvironment environment
) {}
