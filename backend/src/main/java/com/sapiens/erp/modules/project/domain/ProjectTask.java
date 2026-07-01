package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_tasks")
@Getter
@Setter
@NoArgsConstructor
public class ProjectTask extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 20)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TaskAssignee assignee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @Column(length = 50)
    private String module;

    @Column(name = "linked_requirement_id", length = 20)
    private String linkedRequirementId;

    @Column(name = "estimated_hours")
    private Integer estimatedHours;

    @Column(name = "actual_hours")
    private Integer actualHours;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "completed_at")
    private Instant completedAt;

    public static ProjectTask create(String title, String description, TaskType taskType,
                                     TaskAssignee assignee, TaskPriority priority,
                                     Sprint sprint, String module,
                                     String linkedRequirementId, Integer estimatedHours,
                                     String notes) {
        ProjectTask t = new ProjectTask();
        t.id = UUID.randomUUID();
        t.title = title;
        t.description = description;
        t.taskType = taskType != null ? taskType : TaskType.DEV;
        t.assignee = assignee;
        t.priority = priority != null ? priority : TaskPriority.MEDIUM;
        t.status = TaskStatus.TODO;
        t.sprint = sprint;
        t.module = module;
        t.linkedRequirementId = linkedRequirementId;
        t.estimatedHours = estimatedHours;
        t.notes = notes;
        return t;
    }

    public void updateStatus(TaskStatus newStatus) {
        this.status = newStatus;
        this.completedAt = (newStatus == TaskStatus.DONE) ? Instant.now() : null;
    }
}
