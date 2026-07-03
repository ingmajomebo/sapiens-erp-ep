package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "epics")
@Getter
@Setter
@NoArgsConstructor
public class Epic extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String objective;

    @Column(name = "success_criteria", columnDefinition = "TEXT")
    private String successCriteria;

    @Column(length = 50)
    private String module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EpicStatus status;

    public static Epic create(String code, String name, String objective,
                              String successCriteria, String module, TaskPriority priority) {
        Epic e = new Epic();
        e.id = UUID.randomUUID();
        e.code = code;
        e.name = name;
        e.objective = objective;
        e.successCriteria = successCriteria;
        e.module = module;
        e.priority = priority != null ? priority : TaskPriority.MEDIUM;
        e.status = EpicStatus.PLANNED;
        return e;
    }
}
