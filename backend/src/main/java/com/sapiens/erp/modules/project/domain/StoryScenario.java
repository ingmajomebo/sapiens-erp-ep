package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "story_scenarios")
@Getter
@Setter
@NoArgsConstructor
public class StoryScenario extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_story_id", nullable = false)
    private UserStory userStory;

    @Column(name = "scenario_title", nullable = false)
    private String scenarioTitle;

    @Column(name = "given_conditions", columnDefinition = "TEXT", nullable = false)
    private String givenConditions;

    @Column(name = "when_event", columnDefinition = "TEXT", nullable = false)
    private String whenEvent;

    @Column(name = "then_outcome", columnDefinition = "TEXT", nullable = false)
    private String thenOutcome;

    @Enumerated(EnumType.STRING)
    @Column(name = "scenario_type", nullable = false, length = 20)
    private ScenarioType scenarioType;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    public static StoryScenario create(UserStory story, String title,
                                       String given, String when, String then,
                                       ScenarioType type, int order) {
        StoryScenario s = new StoryScenario();
        s.id = UUID.randomUUID();
        s.userStory = story;
        s.scenarioTitle = title;
        s.givenConditions = given;
        s.whenEvent = when;
        s.thenOutcome = then;
        s.scenarioType = type != null ? type : ScenarioType.HAPPY_PATH;
        s.sortOrder = order;
        return s;
    }
}
