package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.RunEnvironment;
import com.sapiens.erp.modules.project.domain.RunStatus;
import com.sapiens.erp.modules.project.domain.RunType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Trazabilidad inversa: participación de una historia en ciclos de prueba. */
public record StoryQaHistoryResponse(
        UUID runId,
        String runCode,
        String runName,
        RunType runType,
        RunStatus runStatus,
        String buildVersion,
        RunEnvironment environment,
        Instant closedAt,
        Map<String, Long> results,
        Instant lastExecutedAt
) {}
