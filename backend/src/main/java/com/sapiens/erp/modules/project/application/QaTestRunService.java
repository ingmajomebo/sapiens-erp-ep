package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.QaTestRunDetailResponse;
import com.sapiens.erp.modules.project.api.dto.QaTestRunRequest;
import com.sapiens.erp.modules.project.api.dto.QaTestRunResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ciclos de prueba QA con alcance dinámico (patrón query-based suite):
 * el POST materializa el alcance en items; ejecutar fuera del alcance o sobre
 * un run cerrado se rechaza; al cerrar se congela el resumen de resultados.
 */
@Service
@RequiredArgsConstructor
public class QaTestRunService {

    private final QaTestRunRepository runRepository;
    private final QaTestRunItemRepository itemRepository;
    private final ScenarioTestExecutionRepository executionRepository;
    private final StoryScenarioRepository scenarioRepository;
    private final SprintRepository sprintRepository;

    @Transactional(readOnly = true)
    public List<QaTestRunResponse> listFiltered(String statusStr, String runTypeStr, UUID sprintId) {
        RunStatus status = statusStr != null ? RunStatus.valueOf(statusStr) : null;
        RunType runType = runTypeStr != null ? RunType.valueOf(runTypeStr) : null;
        return runRepository.findFiltered(status, runType, sprintId).stream()
                .map(r -> QaTestRunResponse.from(r, itemRepository.findByRunId(r.getId()).size()))
                .toList();
    }

    @Transactional
    public QaTestRunResponse create(QaTestRunRequest req) {
        List<StoryScenario> scope = resolveScope(req.scope());
        if (scope.isEmpty()) {
            throw new IllegalArgumentException("El alcance del run no contiene ningún escenario activo");
        }

        Sprint sprint = null;
        if (req.sprintId() != null) {
            sprint = sprintRepository.findByIdAndDeletedAtIsNull(req.sprintId())
                    .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + req.sprintId()));
        }

        QaTestRun run = QaTestRun.create(nextCode(), req.name(), req.runType(),
                req.buildVersion(), req.environment(), req.openedBy(), req.notes(), sprint);
        runRepository.save(run);

        for (StoryScenario sc : scope) {
            itemRepository.save(QaTestRunItem.create(run, sc, sc.getUserStory()));
        }
        return QaTestRunResponse.from(run, scope.size());
    }

    @Transactional(readOnly = true)
    public QaTestRunDetailResponse getDetail(UUID id) {
        QaTestRun run = findActive(id);
        List<QaTestRunItem> items = itemRepository.findByRunId(id);

        // Última ejecución por escenario dentro del run (vienen ordenadas DESC)
        Map<UUID, ScenarioTestExecution> latest = new HashMap<>();
        for (ScenarioTestExecution e : executionRepository.findByRunId(id)) {
            latest.putIfAbsent(e.getScenario().getId(), e);
        }

        List<QaTestRunDetailResponse.Item> itemDtos = items.stream()
                .map(i -> {
                    ScenarioTestExecution last = latest.get(i.getScenario().getId());
                    return new QaTestRunDetailResponse.Item(
                            i.getScenario().getId(),
                            i.getStory().getId(),
                            i.getStory().getReqId(),
                            i.getScenario().getScenarioTitle(),
                            i.getScenario().getVersion(),
                            last != null ? last.getResult() : null,
                            last != null ? last.getExecutedAt() : null,
                            last == null
                    );
                })
                .toList();

        return new QaTestRunDetailResponse(QaTestRunResponse.from(run, items.size()), itemDtos);
    }

    @Transactional
    public QaTestRunResponse close(UUID id) {
        QaTestRun run = findActive(id);
        if (run.getStatus() == RunStatus.CLOSED) {
            throw new IllegalArgumentException("El run " + run.getCode() + " ya está cerrado");
        }

        List<QaTestRunItem> items = itemRepository.findByRunId(id);
        Map<UUID, ScenarioTestExecution> latest = new HashMap<>();
        for (ScenarioTestExecution e : executionRepository.findByRunId(id)) {
            latest.putIfAbsent(e.getScenario().getId(), e);
        }

        int passed = 0, failed = 0, blocked = 0, skipped = 0, pending = 0;
        for (QaTestRunItem i : items) {
            ScenarioTestExecution last = latest.get(i.getScenario().getId());
            if (last == null) { pending++; continue; }
            switch (last.getResult()) {
                case PASS -> passed++;
                case FAIL -> failed++;
                case BLOCKED -> blocked++;
                case SKIPPED -> skipped++;
            }
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("blocked", blocked);
        summary.put("skipped", skipped);
        summary.put("pending", pending);

        run.setSummary(summary);
        run.setStatus(RunStatus.CLOSED);
        run.setClosedAt(Instant.now());
        runRepository.save(run);
        return QaTestRunResponse.from(run, items.size());
    }

    private List<StoryScenario> resolveScope(QaTestRunRequest.Scope scope) {
        return switch (scope.type()) {
            case TAG -> {
                if (scope.tag() == null || scope.tag().isBlank()) {
                    throw new IllegalArgumentException("El alcance por TAG requiere el campo tag");
                }
                yield scenarioRepository.findActiveByTag(scope.tag().trim());
            }
            case EPIC -> {
                if (scope.epicId() == null) {
                    throw new IllegalArgumentException("El alcance por EPIC requiere epicId");
                }
                yield scenarioRepository.findActiveByEpicId(scope.epicId());
            }
            case STORIES -> {
                if (scope.storyIds() == null || scope.storyIds().isEmpty()) {
                    throw new IllegalArgumentException("El alcance por STORIES requiere storyIds");
                }
                yield scenarioRepository.findActiveByStoryIds(scope.storyIds());
            }
        };
    }

    private QaTestRun findActive(UUID id) {
        return runRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Run no encontrado: " + id));
    }

    private String nextCode() {
        int n = 1;
        String code;
        do {
            code = String.format("RUN-%02d", n++);
        } while (runRepository.existsByCodeAndDeletedAtIsNull(code));
        return code;
    }
}
