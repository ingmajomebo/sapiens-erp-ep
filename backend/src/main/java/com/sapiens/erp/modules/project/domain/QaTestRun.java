package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Ciclo de prueba QA (test run): agrupa ejecuciones de escenarios bajo un contexto
 * común (build, ambiente, tipo). El alcance se materializa en QaTestRunItem al crearlo.
 */
@Entity
@Table(name = "qa_test_runs")
@Getter
@Setter
@NoArgsConstructor
public class QaTestRun extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_type", nullable = false, length = 20)
    private RunType runType;

    @Column(name = "build_version", length = 50)
    private String buildVersion;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RunEnvironment environment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RunStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "opened_by", length = 20)
    private TaskAssignee openedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> summary;

    public static QaTestRun create(String code, String name, RunType runType,
                                   String buildVersion, RunEnvironment environment,
                                   TaskAssignee openedBy, String notes, Sprint sprint) {
        QaTestRun r = new QaTestRun();
        r.id = UUID.randomUUID();
        r.code = code;
        r.name = name;
        r.runType = runType != null ? runType : RunType.FEATURE;
        r.buildVersion = buildVersion;
        r.environment = environment;
        r.status = RunStatus.OPEN;
        r.openedBy = openedBy;
        r.notes = notes;
        r.sprint = sprint;
        return r;
    }
}
