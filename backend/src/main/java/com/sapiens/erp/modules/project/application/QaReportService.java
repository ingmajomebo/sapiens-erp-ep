package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.QaAttachmentResponse;
import com.sapiens.erp.modules.project.api.dto.QaCoverageResponse;
import com.sapiens.erp.modules.project.api.dto.QaRunTreeResponse;
import com.sapiens.erp.modules.project.api.dto.QaTestRunResponse;
import com.sapiens.erp.modules.project.api.dto.StoryQaHistoryResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/** Consultas de trazabilidad QA de solo lectura: árbol de run, cobertura e historial por historia. */
@Service
@RequiredArgsConstructor
public class QaReportService {

    private final QaTestRunRepository runRepository;
    private final QaTestRunItemRepository itemRepository;
    private final ScenarioTestExecutionRepository executionRepository;
    private final UserStoryRepository storyRepository;
    private final QaExecutionAttachmentRepository attachmentRepository;

    // ── Árbol del run: Run → Épica → Historia → Escenario → Ejecuciones ──────

    @Transactional(readOnly = true)
    public QaRunTreeResponse getRunTree(UUID runId) {
        QaTestRun run = runRepository.findByIdAndDeletedAtIsNull(runId)
                .orElseThrow(() -> new IllegalArgumentException("Run no encontrado: " + runId));

        List<QaTestRunItem> items = itemRepository.findByRunIdWithEpic(runId);

        List<ScenarioTestExecution> runExecutions = executionRepository.findByRunIdWithDefects(runId);
        Map<UUID, List<ScenarioTestExecution>> execsByScenario = runExecutions.stream()
                .collect(Collectors.groupingBy(e -> e.getScenario().getId()));

        Map<UUID, List<QaAttachmentResponse>> attachmentsByExecution = runExecutions.isEmpty()
                ? Map.of()
                : attachmentRepository.findByExecutionIds(
                        runExecutions.stream().map(ScenarioTestExecution::getId).toList()).stream()
                        .collect(Collectors.groupingBy(a -> a.getExecution().getId(),
                                Collectors.mapping(QaAttachmentResponse::from, Collectors.toList())));

        // Agrupar items por épica (null = sin épica) y por historia preservando orden
        Map<UUID, List<QaTestRunItem>> itemsByStory = items.stream()
                .collect(Collectors.groupingBy(i -> i.getStory().getId(), LinkedHashMap::new, Collectors.toList()));

        Map<UUID, List<QaRunTreeResponse.StoryNode>> storiesByEpic = new LinkedHashMap<>();
        Map<UUID, Epic> epicById = new LinkedHashMap<>();

        for (Map.Entry<UUID, List<QaTestRunItem>> entry : itemsByStory.entrySet()) {
            UserStory story = entry.getValue().get(0).getStory();
            Epic epic = story.getEpic();
            UUID epicKey = epic != null ? epic.getId() : null;
            if (epic != null) epicById.put(epic.getId(), epic);

            List<QaRunTreeResponse.ScenarioNode> scenarioNodes = entry.getValue().stream()
                    .map(i -> toScenarioNode(i.getScenario(),
                            execsByScenario.get(i.getScenario().getId()), attachmentsByExecution))
                    .toList();

            String title = story.getActionStatement() != null
                    ? story.getActionStatement()
                    : (story.getDescription() != null ? story.getDescription() : story.getReqId());

            storiesByEpic.computeIfAbsent(epicKey, k -> new ArrayList<>())
                    .add(new QaRunTreeResponse.StoryNode(story.getId(), story.getReqId(),
                            title, story.getStatus(), scenarioNodes));
        }

        List<QaRunTreeResponse.EpicNode> epics = new ArrayList<>();
        for (Map.Entry<UUID, List<QaRunTreeResponse.StoryNode>> e : storiesByEpic.entrySet()) {
            Epic epic = e.getKey() != null ? epicById.get(e.getKey()) : null;
            epics.add(new QaRunTreeResponse.EpicNode(
                    epic != null ? epic.getId() : null,
                    epic != null ? epic.getCode() : null,
                    epic != null ? epic.getName() : "Sin épica",
                    e.getValue()));
        }

        long total = items.size();
        return new QaRunTreeResponse(QaTestRunResponse.from(run, total), epics);
    }

    private QaRunTreeResponse.ScenarioNode toScenarioNode(StoryScenario sc, List<ScenarioTestExecution> execs,
                                                          Map<UUID, List<QaAttachmentResponse>> attachmentsByExecution) {
        List<QaRunTreeResponse.ExecutionNode> execNodes = execs == null ? List.of() : execs.stream()
                .map(e -> new QaRunTreeResponse.ExecutionNode(
                        e.getId(), e.getResult(), e.getExecutedBy(), e.getExecutedAt(), e.getNotes(),
                        snapshotVersion(e), e.getBuildVersion(), e.getEnvironment(),
                        e.getDefectTask() != null ? e.getDefectTask().getId() : null,
                        e.getDefectTask() != null ? e.getDefectTask().getTitle() : null,
                        attachmentsByExecution.getOrDefault(e.getId(), List.of())))
                .toList();
        return new QaRunTreeResponse.ScenarioNode(
                sc.getId(), sc.getScenarioTitle(), sc.getVersion(), sc.getScenarioType().name(),
                sc.getTags() != null ? List.of(sc.getTags()) : List.of(),
                sc.getGivenConditions(), sc.getWhenEvent(), sc.getThenOutcome(),
                execNodes.isEmpty(), execNodes);
    }

    private Integer snapshotVersion(ScenarioTestExecution e) {
        Object v = e.getScenarioSnapshot() != null ? e.getScenarioSnapshot().get("version") : null;
        return v instanceof Number n ? n.intValue() : null;
    }

    // ── Cobertura ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public QaCoverageResponse getCoverage(UUID epicId, String module) {
        List<UserStory> stories = storyRepository
                .findFiltered(StoryType.FUNCTIONAL, module, null).stream()
                .filter(s -> epicId == null || (s.getEpic() != null && epicId.equals(s.getEpic().getId())))
                .toList();

        List<UUID> storyIds = stories.stream().map(UserStory::getId).toList();
        Map<UUID, TestResult> lastByScenario = new HashMap<>();
        Set<UUID> everExecuted = new HashSet<>();
        if (!storyIds.isEmpty()) {
            for (ScenarioTestExecution e : executionRepository.findByStoryIds(storyIds)) {
                lastByScenario.putIfAbsent(e.getScenario().getId(), e.getResult());
                everExecuted.add(e.getScenario().getId());
            }
        }

        Map<UUID, List<QaCoverageResponse.StoryCoverage>> byEpic = new LinkedHashMap<>();
        Map<UUID, Epic> epicById = new LinkedHashMap<>();

        for (UserStory story : stories) {
            List<StoryScenario> active = story.getScenarios().stream()
                    .filter(sc -> sc.getDeletedAt() == null && Boolean.TRUE.equals(sc.getIsActive()))
                    .toList();
            if (active.isEmpty() && story.getEpic() == null) continue;

            long covered = active.stream().filter(sc -> everExecuted.contains(sc.getId())).count();
            Map<TestResult, Long> lastResults = active.stream()
                    .map(sc -> lastByScenario.get(sc.getId()))
                    .filter(Objects::nonNull)
                    .collect(Collectors.groupingBy(r -> r, Collectors.counting()));
            List<QaCoverageResponse.UncoveredScenario> never = active.stream()
                    .filter(sc -> !everExecuted.contains(sc.getId()))
                    .map(sc -> new QaCoverageResponse.UncoveredScenario(sc.getId(), sc.getScenarioTitle()))
                    .toList();

            Epic epic = story.getEpic();
            if (epic != null) epicById.put(epic.getId(), epic);
            byEpic.computeIfAbsent(epic != null ? epic.getId() : null, k -> new ArrayList<>())
                    .add(new QaCoverageResponse.StoryCoverage(story.getId(), story.getReqId(),
                            story.getStatus(), active.size(), covered, lastResults, never));
        }

        List<QaCoverageResponse.EpicCoverage> epicCoverages = new ArrayList<>();
        long tTotal = 0, tCovered = 0, tPassing = 0;
        for (Map.Entry<UUID, List<QaCoverageResponse.StoryCoverage>> e : byEpic.entrySet()) {
            long total = e.getValue().stream().mapToLong(QaCoverageResponse.StoryCoverage::totalScenarios).sum();
            long covered = e.getValue().stream().mapToLong(QaCoverageResponse.StoryCoverage::coveredScenarios).sum();
            long passing = e.getValue().stream()
                    .mapToLong(s -> s.lastResults().getOrDefault(TestResult.PASS, 0L)).sum();
            Epic epic = e.getKey() != null ? epicById.get(e.getKey()) : null;
            epicCoverages.add(new QaCoverageResponse.EpicCoverage(
                    epic != null ? epic.getId() : null,
                    epic != null ? epic.getCode() : null,
                    epic != null ? epic.getName() : "Sin épica",
                    total, covered, passing,
                    total > 0 ? (int) Math.round(covered * 100.0 / total) : 0,
                    total > 0 ? (int) Math.round(passing * 100.0 / total) : 0,
                    e.getValue()));
            tTotal += total;
            tCovered += covered;
            tPassing += passing;
        }

        return new QaCoverageResponse(
                new QaCoverageResponse.Totals(tTotal, tCovered, tPassing, tTotal - tCovered),
                epicCoverages);
    }

    // ── Historial por historia (trazabilidad inversa) ─────────────────────────

    @Transactional(readOnly = true)
    public List<StoryQaHistoryResponse> getStoryHistory(UUID storyId) {
        List<QaTestRunItem> items = itemRepository.findByStoryIdWithRun(storyId);
        Map<UUID, List<QaTestRunItem>> byRun = items.stream()
                .collect(Collectors.groupingBy(i -> i.getRun().getId(), LinkedHashMap::new, Collectors.toList()));

        List<ScenarioTestExecution> execs = executionRepository.findByStoryId(storyId).stream()
                .filter(e -> e.getTestRun() != null)
                .toList();

        List<StoryQaHistoryResponse> result = new ArrayList<>();
        for (Map.Entry<UUID, List<QaTestRunItem>> entry : byRun.entrySet()) {
            QaTestRun run = entry.getValue().get(0).getRun();
            List<ScenarioTestExecution> runExecs = execs.stream()
                    .filter(e -> run.getId().equals(e.getTestRun().getId()))
                    .toList();

            // Último resultado por escenario de esta historia dentro del run
            Map<UUID, TestResult> latest = new HashMap<>();
            for (ScenarioTestExecution e : runExecs) {
                latest.putIfAbsent(e.getScenario().getId(), e.getResult());
            }
            Map<String, Long> results = latest.values().stream()
                    .collect(Collectors.groupingBy(r -> r.name().toLowerCase(), Collectors.counting()));
            long pending = entry.getValue().stream()
                    .filter(i -> !latest.containsKey(i.getScenario().getId())).count();
            results.put("pending", pending);

            result.add(new StoryQaHistoryResponse(
                    run.getId(), run.getCode(), run.getName(), run.getRunType(), run.getStatus(),
                    run.getBuildVersion(), run.getEnvironment(), run.getClosedAt(), results,
                    runExecs.isEmpty() ? null : runExecs.get(0).getExecutedAt()));
        }
        return result;
    }
}
