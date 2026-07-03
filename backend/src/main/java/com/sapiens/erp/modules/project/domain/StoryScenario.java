package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    /** Se incrementa en cada edición del texto Gherkin; las ejecuciones guardan la versión probada. */
    @Column(nullable = false)
    private Integer version = 1;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] tags = new String[0];

    /** Los escenarios inactivos no cuentan para derivar el estado DONE de la historia. */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = Boolean.TRUE;

    /** Marca una nueva versión del escenario tras editar su contenido Gherkin. */
    public void bumpVersion() {
        this.version = this.version + 1;
    }

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
        s.version = 1;
        s.tags = new String[0];
        s.isActive = Boolean.TRUE;
        return s;
    }
}
