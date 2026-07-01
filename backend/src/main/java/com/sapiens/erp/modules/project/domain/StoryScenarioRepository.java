package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoryScenarioRepository extends JpaRepository<StoryScenario, UUID> {

    List<StoryScenario> findByUserStoryIdAndDeletedAtIsNullOrderBySortOrderAsc(UUID userStoryId);

    Optional<StoryScenario> findByIdAndDeletedAtIsNull(UUID id);
}
