package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoryScenarioRepository extends JpaRepository<StoryScenario, UUID> {

    List<StoryScenario> findByUserStoryIdAndDeletedAtIsNullOrderBySortOrderAsc(UUID userStoryId);

    Optional<StoryScenario> findByIdAndDeletedAtIsNull(UUID id);

    @Query(value = """
        SELECT sc.* FROM story_scenarios sc
        JOIN user_stories us ON us.id = sc.user_story_id
        WHERE sc.deleted_at IS NULL AND sc.is_active
          AND us.deleted_at IS NULL
          AND :tag = ANY(sc.tags)
        """, nativeQuery = true)
    List<StoryScenario> findActiveByTag(@Param("tag") String tag);

    @Query("""
        SELECT sc FROM StoryScenario sc
        WHERE sc.deletedAt IS NULL AND sc.isActive = true
          AND sc.userStory.deletedAt IS NULL
          AND sc.userStory.epic.id = :epicId
        """)
    List<StoryScenario> findActiveByEpicId(@Param("epicId") UUID epicId);

    @Query("""
        SELECT sc FROM StoryScenario sc
        WHERE sc.deletedAt IS NULL AND sc.isActive = true
          AND sc.userStory.deletedAt IS NULL
          AND sc.userStory.id IN :storyIds
        """)
    List<StoryScenario> findActiveByStoryIds(@Param("storyIds") List<UUID> storyIds);
}
