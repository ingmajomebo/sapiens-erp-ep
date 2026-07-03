package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QaTestRunRepository extends JpaRepository<QaTestRun, UUID> {

    @Query("""
        SELECT r FROM QaTestRun r
        WHERE r.deletedAt IS NULL
          AND (:status   IS NULL OR r.status   = :status)
          AND (:runType  IS NULL OR r.runType  = :runType)
          AND (:sprintId IS NULL OR r.sprint.id = :sprintId)
        ORDER BY r.createdAt DESC
        """)
    List<QaTestRun> findFiltered(@Param("status") RunStatus status,
                                 @Param("runType") RunType runType,
                                 @Param("sprintId") UUID sprintId);

    Optional<QaTestRun> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByCodeAndDeletedAtIsNull(String code);
}
