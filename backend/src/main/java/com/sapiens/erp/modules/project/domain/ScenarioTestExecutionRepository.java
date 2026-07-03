package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ScenarioTestExecutionRepository extends JpaRepository<ScenarioTestExecution, UUID> {

    @Query("""
        SELECT e FROM ScenarioTestExecution e
        WHERE e.deletedAt IS NULL
          AND e.userStory.id = :storyId
        ORDER BY e.executedAt DESC
        """)
    List<ScenarioTestExecution> findByStoryId(@Param("storyId") UUID storyId);

    @Query("""
        SELECT e FROM ScenarioTestExecution e
        WHERE e.deletedAt IS NULL
          AND e.testRun.id = :runId
        ORDER BY e.executedAt DESC
        """)
    List<ScenarioTestExecution> findByRunId(@Param("runId") UUID runId);

    @Query("""
        SELECT e FROM ScenarioTestExecution e
        LEFT JOIN FETCH e.defectTask
        WHERE e.deletedAt IS NULL
          AND e.testRun.id = :runId
        ORDER BY e.executedAt DESC
        """)
    List<ScenarioTestExecution> findByRunIdWithDefects(@Param("runId") UUID runId);

    @Query("""
        SELECT e FROM ScenarioTestExecution e
        WHERE e.deletedAt IS NULL
          AND e.userStory.id IN :storyIds
        ORDER BY e.executedAt DESC
        """)
    List<ScenarioTestExecution> findByStoryIds(@Param("storyIds") List<UUID> storyIds);
}
