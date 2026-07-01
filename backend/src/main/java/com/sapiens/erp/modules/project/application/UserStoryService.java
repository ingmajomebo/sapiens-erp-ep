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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserStoryService {

    private final UserStoryRepository storyRepository;
    private final StoryScenarioRepository scenarioRepository;

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
        UserStory story = UserStory.create(
                req.reqId(), req.epic(), req.storyType(),
                req.persona(), req.actionStatement(), req.outcomeStatement(),
                req.description(), req.module(), req.priority(),
                req.nfrCategory(), req.nfrCriterion()
        );
        if (req.status() != null) story.setStatus(req.status());
        return UserStoryResponse.from(storyRepository.save(story));
    }

    @Transactional
    public UserStoryResponse update(UUID id, UserStoryRequest req) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));
        story.setReqId(req.reqId());
        story.setEpic(req.epic());
        story.setStoryType(req.storyType() != null ? req.storyType() : story.getStoryType());
        story.setPersona(req.persona());
        story.setActionStatement(req.actionStatement());
        story.setOutcomeStatement(req.outcomeStatement());
        story.setDescription(req.description());
        story.setModule(req.module());
        story.setPriority(req.priority() != null ? req.priority() : story.getPriority());
        if (req.status() != null) story.setStatus(req.status());
        story.setNfrCategory(req.nfrCategory());
        story.setNfrCriterion(req.nfrCriterion());
        return UserStoryResponse.from(storyRepository.save(story));
    }

    @Transactional
    public UserStoryResponse updateStatus(UUID id, StoryStatus status) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));
        story.setStatus(status);
        return UserStoryResponse.from(storyRepository.save(story));
    }

    @Transactional
    public void delete(UUID id) {
        UserStory story = storyRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + id));
        story.softDelete();
        storyRepository.save(story);
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
        return StoryScenarioResponse.from(scenarioRepository.save(scenario));
    }

    @Transactional
    public StoryScenarioResponse updateScenario(UUID scenarioId, StoryScenarioRequest req) {
        StoryScenario sc = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));
        sc.setScenarioTitle(req.scenarioTitle());
        sc.setGivenConditions(req.givenConditions());
        sc.setWhenEvent(req.whenEvent());
        sc.setThenOutcome(req.thenOutcome());
        if (req.scenarioType() != null) sc.setScenarioType(req.scenarioType());
        if (req.sortOrder() != null) sc.setSortOrder(req.sortOrder());
        return StoryScenarioResponse.from(scenarioRepository.save(sc));
    }

    @Transactional
    public void deleteScenario(UUID scenarioId) {
        StoryScenario sc = scenarioRepository.findByIdAndDeletedAtIsNull(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("Escenario no encontrado: " + scenarioId));
        sc.softDelete();
        scenarioRepository.save(sc);
    }
}
