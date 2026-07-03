package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.project.api.dto.QaAttachmentResponse;
import com.sapiens.erp.modules.project.api.dto.TestExecutionRequest;
import com.sapiens.erp.modules.project.api.dto.TestExecutionResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ciclo de QA sobre historias de usuario.
 *
 * Los escenarios Gherkin de la historia son sus criterios de aceptación:
 * cada uno se ejecuta y se registra PASS/FAIL/BLOCKED/SKIPPED de forma inmutable.
 * El estado de la historia se deriva automáticamente:
 *  - un FAIL   → QA_FAILED (y opcionalmente se crea una task BUG vinculada)
 *  - todos los escenarios con último resultado PASS → DONE
 *  - en cualquier otro caso, la historia queda IN_QA
 */
@Service
@RequiredArgsConstructor
public class QaExecutionService {

    private final UserStoryRepository storyRepository;
    private final StoryScenarioRepository scenarioRepository;
    private final ScenarioTestExecutionRepository executionRepository;
    private final ProjectTaskRepository taskRepository;
    private final QaTestRunRepository runRepository;
    private final QaTestRunItemRepository runItemRepository;
    private final UserRepository userRepository;
    private final QaExecutionAttachmentRepository attachmentRepository;

    @Transactional(readOnly = true)
    public List<TestExecutionResponse> listByStory(UUID storyId) {
        List<ScenarioTestExecution> executions = executionRepository.findByStoryId(storyId);
        Map<UUID, List<QaAttachmentResponse>> attachments = attachmentsFor(executions);
        return executions.stream()
                .map(e -> TestExecutionResponse.from(e, attachments.getOrDefault(e.getId(), List.of())))
                .toList();
    }

    /** Adjuntos agrupados por ejecución en una sola consulta (sin N+1). */
    private Map<UUID, List<QaAttachmentResponse>> attachmentsFor(List<ScenarioTestExecution> executions) {
        if (executions.isEmpty()) return Map.of();
        List<UUID> ids = executions.stream().map(ScenarioTestExecution::getId).toList();
        return attachmentRepository.findByExecutionIds(ids).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        a -> a.getExecution().getId(),
                        java.util.stream.Collectors.mapping(QaAttachmentResponse::from,
                                java.util.stream.Collectors.toList())));
    }

    @Transactional
    public TestExecutionResponse recordExecution(UUID storyId, UUID scenarioId, TestExecutionRequest req) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(storyId)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + storyId));
        StoryScenario scenario = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));
        if (!scenario.getUserStory().getId().equals(story.getId())) {
            throw new IllegalArgumentException("El escenario no pertenece a la historia " + story.getReqId());
        }

        ScenarioTestExecution execution = ScenarioTestExecution.create(
                story, scenario, req.result(), req.executedBy(), req.notes());
        execution.setExecutedByPrincipal(currentPrincipal());

        if (req.testRunId() != null) {
            QaTestRun run = runRepository.findByIdAndDeletedAtIsNull(req.testRunId())
                    .orElseThrow(() -> new IllegalArgumentException("Run no encontrado: " + req.testRunId()));
            if (run.getStatus() == RunStatus.CLOSED) {
                throw new IllegalArgumentException("El run " + run.getCode() + " está cerrado; no admite ejecuciones");
            }
            if (!runItemRepository.existsByRunIdAndScenarioIdAndDeletedAtIsNull(run.getId(), scenarioId)) {
                throw new IllegalArgumentException("El escenario no está en el alcance del run " + run.getCode());
            }
            execution.setTestRun(run);
            execution.setBuildVersion(run.getBuildVersion());
            execution.setEnvironment(run.getEnvironment());
        } else {
            execution.setBuildVersion(req.buildVersion());
            execution.setEnvironment(req.environment());
        }

        if (req.result() == TestResult.FAIL && Boolean.TRUE.equals(req.createDefect())) {
            String title = (req.defectTitle() != null && !req.defectTitle().isBlank())
                    ? req.defectTitle().trim()
                    : "BUG " + story.getReqId() + " — " + scenario.getScenarioTitle();
            ProjectTask defect = ProjectTask.create(
                    title, req.notes(), TaskType.BUG,
                    req.defectAssignee(), TaskPriority.HIGH,
                    null, story.getModule(), story, null, null);
            execution.setDefectTask(taskRepository.save(defect));
        }

        executionRepository.save(execution);
        story.setStatus(deriveStatus(story, scenarioId, req.result()));
        storyRepository.save(story);

        return TestExecutionResponse.from(execution);
    }

    /**
     * Email del usuario autenticado; null si no hay contexto de seguridad.
     * El principal JWT es el UUID del usuario — se resuelve a email vía identity.
     */
    private String currentPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        try {
            return userRepository.findById(UUID.fromString(auth.getName()))
                    .map(u -> u.getEmail())
                    .orElse(auth.getName());
        } catch (IllegalArgumentException notAUuid) {
            return auth.getName();
        }
    }

    private StoryStatus deriveStatus(UserStory story, UUID justExecutedScenarioId, TestResult justRecorded) {
        if (justRecorded == TestResult.FAIL) return StoryStatus.QA_FAILED;

        // Último resultado por escenario (las ejecuciones vienen ordenadas DESC por fecha)
        Map<UUID, TestResult> latest = new HashMap<>();
        latest.put(justExecutedScenarioId, justRecorded);
        for (ScenarioTestExecution e : executionRepository.findByStoryId(story.getId())) {
            latest.putIfAbsent(e.getScenario().getId(), e.getResult());
        }

        List<StoryScenario> activeScenarios = story.getScenarios().stream()
                .filter(sc -> sc.getDeletedAt() == null && Boolean.TRUE.equals(sc.getIsActive()))
                .toList();

        boolean allPass = !activeScenarios.isEmpty() && activeScenarios.stream()
                .allMatch(sc -> latest.get(sc.getId()) == TestResult.PASS);

        return allPass ? StoryStatus.DONE : StoryStatus.IN_QA;
    }
}
