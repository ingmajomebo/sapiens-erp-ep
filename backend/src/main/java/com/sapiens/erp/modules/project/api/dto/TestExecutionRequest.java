package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TestResult;
import jakarta.validation.constraints.NotNull;

public record TestExecutionRequest(
        @NotNull TestResult result,
        TaskAssignee executedBy,
        String notes,
        Boolean createDefect,
        String defectTitle,
        TaskAssignee defectAssignee
) {}
