package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.RunEnvironment;
import com.sapiens.erp.modules.project.domain.ScenarioTestExecution;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TestResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TestExecutionResponse(
        UUID id,
        UUID scenarioId,
        String scenarioTitle,
        TestResult result,
        TaskAssignee executedBy,
        String executedByPrincipal,
        String notes,
        UUID defectTaskId,
        String defectTaskTitle,
        Instant executedAt,
        StoryStatus storyStatusAfter,
        UUID testRunId,
        String testRunCode,
        Map<String, Object> scenarioSnapshot,
        String buildVersion,
        RunEnvironment environment,
        List<QaAttachmentResponse> attachments
) {
    public static TestExecutionResponse from(ScenarioTestExecution e) {
        return from(e, List.of());
    }

    public static TestExecutionResponse from(ScenarioTestExecution e, List<QaAttachmentResponse> attachments) {
        return new TestExecutionResponse(
                e.getId(),
                e.getScenario().getId(),
                e.getScenario().getScenarioTitle(),
                e.getResult(),
                e.getExecutedBy(),
                e.getExecutedByPrincipal(),
                e.getNotes(),
                e.getDefectTask() != null ? e.getDefectTask().getId() : null,
                e.getDefectTask() != null ? e.getDefectTask().getTitle() : null,
                e.getExecutedAt(),
                e.getUserStory().getStatus(),
                e.getTestRun() != null ? e.getTestRun().getId() : null,
                e.getTestRun() != null ? e.getTestRun().getCode() : null,
                e.getScenarioSnapshot(),
                e.getBuildVersion(),
                e.getEnvironment(),
                attachments
        );
    }
}
