package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QaTestRunItemRepository extends JpaRepository<QaTestRunItem, UUID> {

    @Query("""
        SELECT i FROM QaTestRunItem i
        JOIN FETCH i.scenario sc
        JOIN FETCH i.story st
        WHERE i.deletedAt IS NULL AND i.run.id = :runId
        """)
    List<QaTestRunItem> findByRunId(@Param("runId") UUID runId);

    @Query("""
        SELECT i FROM QaTestRunItem i
        JOIN FETCH i.scenario sc
        JOIN FETCH i.story st
        LEFT JOIN FETCH st.epic
        WHERE i.deletedAt IS NULL AND i.run.id = :runId
        """)
    List<QaTestRunItem> findByRunIdWithEpic(@Param("runId") UUID runId);

    @Query("""
        SELECT i FROM QaTestRunItem i
        JOIN FETCH i.run r
        WHERE i.deletedAt IS NULL AND i.story.id = :storyId
        ORDER BY r.createdAt DESC
        """)
    List<QaTestRunItem> findByStoryIdWithRun(@Param("storyId") UUID storyId);

    boolean existsByRunIdAndScenarioIdAndDeletedAtIsNull(UUID runId, UUID scenarioId);
}
