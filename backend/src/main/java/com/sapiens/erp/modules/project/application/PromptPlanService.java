package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.ExecutionFeedbackRequest;
import com.sapiens.erp.modules.project.api.dto.PromptPlanRequest;
import com.sapiens.erp.modules.project.api.dto.PromptPlanResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromptPlanService {

    private final PromptPlanRepository promptRepository;
    private final ProjectTaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<PromptPlanResponse> listAll() {
        return promptRepository.findAllActive().stream()
                .map(PromptPlanResponse::from)
                .toList();
    }

    @Transactional
    public PromptPlanResponse create(PromptPlanRequest req) {
        ProjectTask linkedTask = null;
        if (req.linkedTaskId() != null) {
            linkedTask = taskRepository.findByIdAndDeletedAtIsNull(req.linkedTaskId())
                    .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada: " + req.linkedTaskId()));
        }
        PromptPlan plan = PromptPlan.create(
                req.title(), req.objective(), req.contextInfo(),
                req.promptContent(), req.module(), req.category(), linkedTask
        );
        return PromptPlanResponse.from(promptRepository.save(plan));
    }

    @Transactional
    public PromptPlanResponse update(UUID id, PromptPlanRequest req) {
        PromptPlan plan = promptRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Prompt no encontrado: " + id));

        ProjectTask linkedTask = null;
        if (req.linkedTaskId() != null) {
            linkedTask = taskRepository.findByIdAndDeletedAtIsNull(req.linkedTaskId()).orElse(null);
        }

        plan.setTitle(req.title());
        plan.setObjective(req.objective());
        plan.setContextInfo(req.contextInfo());
        plan.setPromptContent(req.promptContent());
        plan.setModule(req.module());
        if (req.category() != null) plan.setCategory(req.category());
        plan.setLinkedTask(linkedTask);

        return PromptPlanResponse.from(promptRepository.save(plan));
    }

    @Transactional
    public PromptPlanResponse updateStatus(UUID id, String newStatus) {
        PromptPlan plan = promptRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Prompt no encontrado: " + id));
        switch (newStatus) {
            case "READY" -> plan.markReady();
            case "USED" -> plan.markUsed();
            case "ARCHIVED" -> plan.archive();
            case "DRAFT" -> plan.setStatus(PromptStatus.DRAFT);
            default -> throw new IllegalArgumentException("Estado inválido: " + newStatus);
        }
        return PromptPlanResponse.from(promptRepository.save(plan));
    }

    @Transactional
    public PromptPlanResponse recordExecution(UUID id, ExecutionFeedbackRequest req) {
        PromptPlan plan = promptRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Prompt no encontrado: " + id));
        plan.recordExecution(req.rating(), req.notes());
        return PromptPlanResponse.from(promptRepository.save(plan));
    }

    @Transactional
    public void delete(UUID id) {
        PromptPlan plan = promptRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Prompt no encontrado: " + id));
        plan.softDelete();
        promptRepository.save(plan);
    }
}
