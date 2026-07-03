package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.StoryStatus;
import com.sapiens.erp.modules.project.domain.TestResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Cobertura de QA: qué criterios de aceptación tienen prueba y cuáles nunca se ejecutaron. */
public record QaCoverageResponse(
        Totals totals,
        List<EpicCoverage> epics
) {
    public record Totals(
            long totalScenarios,
            long coveredScenarios,
            long passingScenarios,
            long neverExecuted
    ) {}

    public record EpicCoverage(
            UUID epicId,
            String epicCode,
            String epicName,
            long totalScenarios,
            long coveredScenarios,
            long passingScenarios,
            int coveragePct,
            int greenPct,
            List<StoryCoverage> stories
    ) {}

    public record StoryCoverage(
            UUID storyId,
            String reqId,
            StoryStatus status,
            long totalScenarios,
            long coveredScenarios,
            Map<TestResult, Long> lastResults,
            List<UncoveredScenario> neverExecuted
    ) {}

    public record UncoveredScenario(UUID scenarioId, String title) {}
}
