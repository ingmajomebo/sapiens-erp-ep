package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectTaskRepository extends JpaRepository<ProjectTask, UUID> {

    @Query("SELECT t FROM ProjectTask t LEFT JOIN FETCH t.sprint WHERE t.deletedAt IS NULL ORDER BY t.createdAt DESC")
    List<ProjectTask> findAllActive();

    Optional<ProjectTask> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
        SELECT t FROM ProjectTask t LEFT JOIN FETCH t.sprint
        WHERE t.deletedAt IS NULL
          AND (:sprintId IS NULL OR t.sprint.id = :sprintId)
          AND (:assignee IS NULL OR t.assignee = :assignee)
          AND (:status IS NULL OR t.status = :status)
        ORDER BY
            CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
            t.createdAt DESC
        """)
    List<ProjectTask> findFiltered(@Param("sprintId") UUID sprintId,
                                   @Param("assignee") TaskAssignee assignee,
                                   @Param("status") TaskStatus status);

    @Query("SELECT t FROM ProjectTask t WHERE t.sprint.id = :sprintId AND t.deletedAt IS NULL")
    List<ProjectTask> findBySprintId(@Param("sprintId") UUID sprintId);

    @Query("SELECT COUNT(t) FROM ProjectTask t WHERE t.sprint.id = :sprintId AND t.status = :status AND t.deletedAt IS NULL")
    long countBySprintAndStatus(@Param("sprintId") UUID sprintId, @Param("status") TaskStatus status);
}
