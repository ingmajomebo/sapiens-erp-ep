package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.TestResult;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Detalle de un run: sus items con el último resultado registrado dentro del run. */
public record QaTestRunDetailResponse(
        QaTestRunResponse run,
        List<Item> items
) {
    public record Item(
            UUID scenarioId,
            UUID storyId,
            String storyReqId,
            String scenarioTitle,
            Integer scenarioVersion,
            TestResult lastResult,
            Instant lastExecutedAt,
            boolean pending
    ) {}
}
