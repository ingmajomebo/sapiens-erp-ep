package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_stories")
@Getter
@Setter
@NoArgsConstructor
public class UserStory extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "req_id", nullable = false, unique = true, length = 20)
    private String reqId;

    /** Nombre de épica heredado (texto libre, pre-V20). Se mantiene solo por compatibilidad. */
    @Column(name = "epic", length = 100)
    private String legacyEpicName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "epic_id")
    private Epic epic;

    @Enumerated(EnumType.STRING)
    @Column(name = "story_type", nullable = false, length = 20)
    private StoryType storyType;

    @Column(length = 150)
    private String persona;

    @Column(name = "action_statement", columnDefinition = "TEXT")
    private String actionStatement;

    @Column(name = "outcome_statement", columnDefinition = "TEXT")
    private String outcomeStatement;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StoryStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "nfr_category", length = 50)
    private NfrCategory nfrCategory;

    @Column(name = "nfr_criterion", columnDefinition = "TEXT")
    private String nfrCriterion;

    @OneToMany(mappedBy = "userStory", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<StoryScenario> scenarios = new ArrayList<>();

    public static UserStory create(String reqId, Epic epic, StoryType storyType,
                                   String persona, String actionStatement, String outcomeStatement,
                                   String description, String module, TaskPriority priority,
                                   NfrCategory nfrCategory, String nfrCriterion) {
        UserStory s = new UserStory();
        s.id = UUID.randomUUID();
        s.reqId = reqId;
        s.epic = epic;
        s.legacyEpicName = epic != null ? epic.getName() : null;
        s.storyType = storyType != null ? storyType : StoryType.FUNCTIONAL;
        s.persona = persona;
        s.actionStatement = actionStatement;
        s.outcomeStatement = outcomeStatement;
        s.description = description;
        s.module = module;
        s.priority = priority != null ? priority : TaskPriority.MEDIUM;
        s.status = StoryStatus.DEFINED;
        s.nfrCategory = nfrCategory;
        s.nfrCriterion = nfrCriterion;
        return s;
    }
}
