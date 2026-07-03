package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.StoryScenarioRequest;
import com.sapiens.erp.modules.project.api.dto.StoryScenarioResponse;
import com.sapiens.erp.modules.project.api.dto.UserStoryRequest;
import com.sapiens.erp.modules.project.api.dto.UserStoryResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserStoryService {

    private final UserStoryRepository storyRepository;
    private final StoryScenarioRepository scenarioRepository;
    private final EpicRepository epicRepository;

    @Transactional(readOnly = true)
    public List<UserStoryResponse> listFiltered(String storyTypeStr, String module, String statusStr) {
        StoryType storyType = storyTypeStr != null ? StoryType.valueOf(storyTypeStr) : null;
        StoryStatus status  = statusStr != null    ? StoryStatus.valueOf(statusStr)    : null;
        return storyRepository.findFiltered(storyType, module, status).stream()
                .map(UserStoryResponse::from)
                .toList();
    }

    @Transactional
    public UserStoryResponse create(UserStoryRequest req) {
        if (storyRepository.existsByReqIdAndDeletedAtIsNull(req.reqId())) {
            throw new IllegalArgumentException("Ya existe una historia activa con el ID " + req.reqId());
        }
        UserStory story = UserStory.create(
                req.reqId(), resolveEpic(req.epicId()), req.storyType(),
                req.persona(), req.actionStatement(), req.outcomeStatement(),
                req.description(), req.module(), req.priority(),
                req.nfrCategory(), req.nfrCriterion()
        );
        if (req.status() != null) {
            // Los estados derivados por QA no son válidos como estado inicial
            if (Set.of(StoryStatus.DONE, StoryStatus.IN_QA, StoryStatus.QA_FAILED).contains(req.status())) {
                throw new IllegalArgumentException(
                        "Una historia no puede crearse en estado " + req.status() + " (se deriva del ciclo de QA)");
            }
            story.setStatus(req.status());
        }
        return UserStoryResponse.from(storyRepository.save(story));
    }

    @Transactional
    public UserStoryResponse update(UUID id, UserStoryRequest req) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));
        story.setReqId(req.reqId());
        Epic epic = resolveEpic(req.epicId());
        story.setEpic(epic);
        story.setLegacyEpicName(epic != null ? epic.getName() : null);
        story.setStoryType(req.storyType() != null ? req.storyType() : story.getStoryType());
        story.setPersona(req.persona());
        story.setActionStatement(req.actionStatement());
        story.setOutcomeStatement(req.outcomeStatement());
        story.setDescription(req.description());
        story.setModule(req.module());
        story.setPriority(req.priority() != null ? req.priority() : story.getPriority());
        if (req.status() != null && req.status() != story.getStatus()) {
            // El PUT respeta la misma máquina de estados que el PATCH
            validateTransition(story, story.getStatus(), req.status());
            if (req.status() == StoryStatus.BLOCKED) story.setPreviousStatus(story.getStatus());
            if (story.getStatus() == StoryStatus.BLOCKED) story.setPreviousStatus(null);
            story.setStatus(req.status());
        }
        story.setNfrCategory(req.nfrCategory());
        story.setNfrCriterion(req.nfrCriterion());
        return UserStoryResponse.from(storyRepository.save(story));
    }

    /**
     * Transiciones válidas por PATCH. IN_QA→QA_FAILED/DONE queda fuera a propósito:
     * esos estados solo los deriva QaExecutionService al registrar resultados.
     * Las historias RNF pueden además REVIEW→DONE (verificación documental).
     */
    private static final Map<StoryStatus, Set<StoryStatus>> ALLOWED_TRANSITIONS = Map.of(
            StoryStatus.DEFINED,      Set.of(StoryStatus.IN_DEV),
            StoryStatus.IN_DEV,       Set.of(StoryStatus.REVIEW),
            StoryStatus.REVIEW,       Set.of(StoryStatus.READY_FOR_QA, StoryStatus.IN_DEV),
            StoryStatus.READY_FOR_QA, Set.of(StoryStatus.IN_QA),
            StoryStatus.IN_QA,        Set.of(),
            StoryStatus.QA_FAILED,    Set.of(StoryStatus.IN_DEV, StoryStatus.READY_FOR_QA),
            StoryStatus.DONE,         Set.of(),
            StoryStatus.BLOCKED,      Set.of()
    );

    @Transactional
    public UserStoryResponse updateStatus(UUID id, StoryStatus status, boolean force) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));

        StoryStatus current = story.getStatus();
        if (!force && status != current) {
            validateTransition(story, current, status);
        }

        if (status == StoryStatus.BLOCKED && current != StoryStatus.BLOCKED) {
            story.setPreviousStatus(current);
        }
        if (current == StoryStatus.BLOCKED && status != StoryStatus.BLOCKED) {
            story.setPreviousStatus(null);
        }
        story.setStatus(status);
        return UserStoryResponse.from(storyRepository.save(story));
    }

    private void validateTransition(UserStory story, StoryStatus current, StoryStatus target) {
        // Cualquier estado (salvo DONE) puede bloquearse
        if (target == StoryStatus.BLOCKED) {
            if (current == StoryStatus.DONE) {
                throw new IllegalArgumentException("Transición no permitida: DONE → BLOCKED");
            }
            return;
        }
        // BLOCKED solo vuelve al estado desde el que se bloqueó
        if (current == StoryStatus.BLOCKED) {
            StoryStatus prev = story.getPreviousStatus() != null ? story.getPreviousStatus() : StoryStatus.IN_DEV;
            if (target != prev) {
                throw new IllegalArgumentException(
                        "Transición no permitida: BLOCKED → " + target + " (solo puede volver a " + prev + ")");
            }
            return;
        }
        // Las RNF se verifican documentalmente: pueden completarse desde revisión
        if (story.getStoryType() == StoryType.NON_FUNCTIONAL
                && current == StoryStatus.REVIEW && target == StoryStatus.DONE) {
            return;
        }
        if (!ALLOWED_TRANSITIONS.getOrDefault(current, Set.of()).contains(target)) {
            throw new IllegalArgumentException("Transición no permitida: " + current + " → " + target);
        }
    }

    @Transactional
    public void delete(UUID id) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));
        story.softDelete();
        storyRepository.save(story);
    }

    private Epic resolveEpic(UUID epicId) {
        if (epicId == null) return null;
        return epicRepository.findByIdAndDeletedAtIsNull(epicId)
                .orElseThrow(() -> new IllegalArgumentException("Épica no encontrada: " + epicId));
    }

    // ── Scenarios ────────────────────────────────────────────────────────────

    @Transactional
    public StoryScenarioResponse addScenario(UUID storyId, StoryScenarioRequest req) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(storyId)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + storyId));
        int order = req.sortOrder() != null ? req.sortOrder() : story.getScenarios().size();
        StoryScenario scenario = StoryScenario.create(
                story, req.scenarioTitle(), req.givenConditions(),
                req.whenEvent(), req.thenOutcome(), req.scenarioType(), order
        );
        applyTags(scenario, req.tags());
        return StoryScenarioResponse.from(scenarioRepository.save(scenario));
    }

    @Transactional
    public StoryScenarioResponse updateScenario(UUID scenarioId, StoryScenarioRequest req) {
        StoryScenario sc = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));

        // Editar el Gherkin crea una nueva versión: las ejecuciones pasadas conservan su snapshot
        boolean gherkinChanged = !sc.getScenarioTitle().equals(req.scenarioTitle())
                || !sc.getGivenConditions().equals(req.givenConditions())
                || !sc.getWhenEvent().equals(req.whenEvent())
                || !sc.getThenOutcome().equals(req.thenOutcome());

        sc.setScenarioTitle(req.scenarioTitle());
        sc.setGivenConditions(req.givenConditions());
        sc.setWhenEvent(req.whenEvent());
        sc.setThenOutcome(req.thenOutcome());
        if (req.scenarioType() != null) sc.setScenarioType(req.scenarioType());
        if (req.sortOrder() != null) sc.setSortOrder(req.sortOrder());
        if (req.isActive() != null) sc.setIsActive(req.isActive());
        if (req.tags() != null) applyTags(sc, req.tags());
        if (gherkinChanged) sc.bumpVersion();
        return StoryScenarioResponse.from(scenarioRepository.save(sc));
    }

    @Transactional
    public StoryScenarioResponse updateScenarioTags(UUID scenarioId, List<String> tags) {
        StoryScenario sc = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));
        applyTags(sc, tags != null ? tags : List.of());
        return StoryScenarioResponse.from(scenarioRepository.save(sc));
    }

    private void applyTags(StoryScenario sc, List<String> tags) {
        if (tags == null) return;
        sc.setTags(tags.stream().map(String::trim).filter(t -> !t.isEmpty()).distinct().toArray(String[]::new));
    }

    @Transactional
    public void deleteScenario(UUID scenarioId) {
        StoryScenario sc = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));
        sc.softDelete();
        scenarioRepository.save(sc);
    }
}
