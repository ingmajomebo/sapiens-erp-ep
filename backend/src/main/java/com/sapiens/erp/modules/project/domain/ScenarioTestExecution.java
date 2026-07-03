package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Registro inmutable de una ejecución de prueba QA sobre un escenario Gherkin.
 * Solo se insertan filas — el historial de ciclos de prueba nunca se edita.
 */
@Entity
@Table(name = "scenario_test_executions")
@Getter
@Setter
@NoArgsConstructor
public class ScenarioTestExecution extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_story_id", nullable = false)
    private UserStory userStory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    private StoryScenario scenario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TestResult result;

    @Enumerated(EnumType.STRING)
    @Column(name = "executed_by", length = 20)
    private TaskAssignee executedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "defect_task_id")
    private ProjectTask defectTask;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_run_id")
    private QaTestRun testRun;

    /** Copia del Gherkin tal como estaba al ejecutar — el historial nunca cambia aunque el escenario se edite. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scenario_snapshot", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> scenarioSnapshot;

    @Column(name = "build_version", length = 50)
    private String buildVersion;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RunEnvironment environment;

    public static ScenarioTestExecution create(UserStory story, StoryScenario scenario,
                                               TestResult result, TaskAssignee executedBy,
                                               String notes) {
        ScenarioTestExecution e = new ScenarioTestExecution();
        e.id = UUID.randomUUID();
        e.userStory = story;
        e.scenario = scenario;
        e.result = result;
        e.executedBy = executedBy;
        e.notes = notes;
        e.executedAt = Instant.now();
        e.scenarioSnapshot = snapshotOf(scenario);
        return e;
    }

    private static Map<String, Object> snapshotOf(StoryScenario sc) {
        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("name", sc.getScenarioTitle());
        snap.put("givenConditions", sc.getGivenConditions());
        snap.put("whenEvent", sc.getWhenEvent());
        snap.put("thenOutcome", sc.getThenOutcome());
        snap.put("scenarioType", sc.getScenarioType().name());
        snap.put("version", sc.getVersion());
        return snap;
    }
}
