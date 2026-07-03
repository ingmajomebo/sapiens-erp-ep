package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserStoryRepository extends JpaRepository<UserStory, UUID> {

    @Query("""
        SELECT s FROM UserStory s
        WHERE s.deletedAt IS NULL
          AND (:storyType IS NULL OR s.storyType = :storyType)
          AND (:module    IS NULL OR s.module    = :module)
          AND (:status    IS NULL OR s.status    = :status)
        ORDER BY s.reqId ASC
        """)
    List<UserStory> findFiltered(@Param("storyType") StoryType storyType,
                                 @Param("module") String module,
                                 @Param("status") StoryStatus status);

    Optional<UserStory> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByReqIdAndDeletedAtIsNull(String reqId);

    List<UserStory> findByEpicIdAndDeletedAtIsNull(UUID epicId);

    @Query("""
        SELECT s.epic.id, COUNT(s), SUM(CASE WHEN s.status = :doneStatus THEN 1 ELSE 0 END)
        FROM UserStory s
        WHERE s.deletedAt IS NULL AND s.epic IS NOT NULL
        GROUP BY s.epic.id
        """)
    List<Object[]> countStoriesByEpic(@Param("doneStatus") StoryStatus doneStatus);
}
