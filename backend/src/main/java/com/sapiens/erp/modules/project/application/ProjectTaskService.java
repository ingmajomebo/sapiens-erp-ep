package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.ProjectTaskRequest;
import com.sapiens.erp.modules.project.api.dto.ProjectTaskResponse;
import com.sapiens.erp.modules.project.api.dto.TaskStatusUpdateRequest;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectTaskService {

    private final ProjectTaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository storyRepository;

    @Transactional(readOnly = true)
    public List<ProjectTaskResponse> listFiltered(UUID sprintId, String assigneeStr, String statusStr) {
        TaskAssignee assignee = assigneeStr != null ? TaskAssignee.valueOf(assigneeStr) : null;
        TaskStatus status = statusStr != null ? TaskStatus.valueOf(statusStr) : null;
        return taskRepository.findFiltered(sprintId, assignee, status).stream()
                .map(ProjectTaskResponse::from)
                .toList();
    }

    @Transactional
    public ProjectTaskResponse create(ProjectTaskRequest req) {
        Sprint sprint = null;
        if (req.sprintId() != null) {
            sprint = sprintRepository.findByIdAndDeletedAtIsNull(req.sprintId())
                    .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + req.sprintId()));
        }
        ProjectTask task = ProjectTask.create(
                req.title(), req.description(), req.taskType(),
                req.assignee(), req.priority(), sprint,
                req.module(), resolveStory(req.userStoryId()),
                req.estimatedHours(), req.notes()
        );
        return ProjectTaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public ProjectTaskResponse update(UUID id, ProjectTaskRequest req) {
        ProjectTask task = taskRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada: " + id));

        Sprint sprint = null;
        if (req.sprintId() != null) {
            sprint = sprintRepository.findByIdAndDeletedAtIsNull(req.sprintId())
                    .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + req.sprintId()));
        }

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setTaskType(req.taskType() != null ? req.taskType() : task.getTaskType());
        task.setAssignee(req.assignee());
        task.setPriority(req.priority() != null ? req.priority() : task.getPriority());
        task.setSprint(sprint);
        task.setModule(req.module());
        UserStory story = resolveStory(req.userStoryId());
        task.setUserStory(story);
        task.setLinkedRequirementId(story != null ? story.getReqId() : null);
        task.setEstimatedHours(req.estimatedHours());
        task.setNotes(req.notes());

        return ProjectTaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public ProjectTaskResponse updateStatus(UUID id, TaskStatusUpdateRequest req) {
        ProjectTask task = taskRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada: " + id));
        // Regla laxa: no saltar directo TODO → DONE ni salir de DONE salvo para reabrir en revisión
        TaskStatus current = task.getStatus();
        TaskStatus target = req.status();
        if (target == TaskStatus.DONE && current == TaskStatus.TODO) {
            throw new IllegalArgumentException("Transición no permitida: TODO → DONE (pasa antes por En curso)");
        }
        if (current == TaskStatus.DONE && target != TaskStatus.DONE && target != TaskStatus.REVIEW) {
            throw new IllegalArgumentException("Transición no permitida: DONE → " + target + " (reabre en REVIEW)");
        }
        task.updateStatus(target);
        return ProjectTaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public ProjectTaskResponse logActualHours(UUID id, Integer hours) {
        ProjectTask task = taskRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada: " + id));
        task.setActualHours(hours);
        return ProjectTaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void delete(UUID id) {
        ProjectTask task = taskRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada: " + id));
        task.softDelete();
        taskRepository.save(task);
    }

    private UserStory resolveStory(UUID storyId) {
        if (storyId == null) return null;
        return storyRepository.findByIdAndDeletedAtIsNull(storyId)
                .orElseThrow(() -> new IllegalArgumentException("Historia no encontrada: " + storyId));
    }
}
