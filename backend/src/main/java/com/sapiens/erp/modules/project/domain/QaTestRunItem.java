package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Escenario incluido en el alcance planeado de un ciclo de prueba. */
@Entity
@Table(name = "qa_test_run_items")
@Getter
@Setter
@NoArgsConstructor
public class QaTestRunItem extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private QaTestRun run;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    private StoryScenario scenario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private UserStory story;

    public static QaTestRunItem create(QaTestRun run, StoryScenario scenario, UserStory story) {
        QaTestRunItem i = new QaTestRunItem();
        i.id = UUID.randomUUID();
        i.run = run;
        i.scenario = scenario;
        i.story = story;
        return i;
    }
}
