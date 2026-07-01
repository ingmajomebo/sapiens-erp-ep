package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "prompt_plans")
@Getter
@Setter
@NoArgsConstructor
public class PromptPlan extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String objective;

    @Column(name = "context_info", columnDefinition = "TEXT")
    private String contextInfo;

    @Column(name = "prompt_content", nullable = false, columnDefinition = "TEXT")
    private String promptContent;

    @Column(length = 50)
    private String module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PromptCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PromptStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_task_id")
    private ProjectTask linkedTask;

    @Column(name = "effectiveness_rating")
    private Short effectivenessRating;

    @Column(name = "execution_notes", columnDefinition = "TEXT")
    private String executionNotes;

    @Column(name = "executed_at")
    private Instant executedAt;

    public static PromptPlan create(String title, String objective, String contextInfo,
                                    String promptContent, String module,
                                    PromptCategory category, ProjectTask linkedTask) {
        PromptPlan p = new PromptPlan();
        p.id = UUID.randomUUID();
        p.title = title;
        p.objective = objective;
        p.contextInfo = contextInfo;
        p.promptContent = promptContent;
        p.module = module;
        p.category = category != null ? category : PromptCategory.NEW_FEATURE;
        p.status = PromptStatus.DRAFT;
        p.linkedTask = linkedTask;
        return p;
    }

    public void markReady() {
        this.status = PromptStatus.READY;
    }

    public void markUsed() {
        this.status = PromptStatus.USED;
    }

    public void archive() {
        this.status = PromptStatus.ARCHIVED;
    }

    public void recordExecution(Short rating, String notes) {
        this.effectivenessRating = rating;
        this.executionNotes = notes;
        this.executedAt = Instant.now();
        this.status = PromptStatus.USED;
    }
}
