package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.ScenarioTestExecution;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TestResult;

import java.time.Instant;
import java.util.UUID;

public record TestExecutionResponse(
        UUID id,
        UUID scenarioId,
        String scenarioTitle,
        TestResult result,
        TaskAssignee executedBy,
        String notes,
        UUID defectTaskId,
        String defectTaskTitle,
        Instant executedAt,
        StoryStatus storyStatusAfter
) {
    public static TestExecutionResponse from(ScenarioTestExecution e) {
        return new TestExecutionResponse(
                e.getId(),
                e.getScenario().getId(),
                e.getScenario().getScenarioTitle(),
                e.getResult(),
                e.getExecutedBy(),
                e.getNotes(),
                e.getDefectTask() != null ? e.getDefectTask().getId() : null,
                e.getDefectTask() != null ? e.getDefectTask().getTitle() : null,
                e.getExecutedAt(),
                e.getUserStory().getStatus()
        );
    }
}
