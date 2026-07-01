package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "sprints")
@Getter
@Setter
@NoArgsConstructor
public class Sprint extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String goal;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SprintStatus status = SprintStatus.PLANNING;

    public static Sprint create(String name, String goal, LocalDate startDate, LocalDate endDate) {
        Sprint s = new Sprint();
        s.id = UUID.randomUUID();
        s.name = name;
        s.goal = goal;
        s.startDate = startDate;
        s.endDate = endDate;
        s.status = SprintStatus.PLANNING;
        return s;
    }

    public void activate() {
        this.status = SprintStatus.ACTIVE;
    }

    public void complete() {
        this.status = SprintStatus.COMPLETED;
    }
}
