package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.RunEnvironment;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import com.sapiens.erp.modules.project.domain.TaskAssignee;
import com.sapiens.erp.modules.project.domain.TestResult;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Árbol de trazabilidad de un run: Run → Épica → Historia → Escenario → Ejecuciones. */
public record QaRunTreeResponse(
        QaTestRunResponse run,
        List<EpicNode> epics
) {
    public record EpicNode(
            UUID epicId,
            String epicCode,
            String epicName,
            List<StoryNode> stories
    ) {}

    public record StoryNode(
            UUID storyId,
            String reqId,
            String title,
            StoryStatus status,
            List<ScenarioNode> scenarios
    ) {}

    public record ScenarioNode(
            UUID scenarioId,
            String title,
            Integer version,
            String scenarioType,
            List<String> tags,
            String givenConditions,
            String whenEvent,
            String thenOutcome,
            boolean pending,
            List<ExecutionNode> executions
    ) {}

    public record ExecutionNode(
            UUID id,
            TestResult result,
            TaskAssignee executedBy,
            Instant executedAt,
            String notes,
            Integer snapshotVersion,
            String buildVersion,
            RunEnvironment environment,
            UUID defectTaskId,
            String defectTaskTitle,
            List<QaAttachmentResponse> attachments
    ) {}
}
