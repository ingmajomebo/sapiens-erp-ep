package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptPlanRepository extends JpaRepository<PromptPlan, UUID> {

    @Query("SELECT p FROM PromptPlan p LEFT JOIN FETCH p.linkedTask WHERE p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    List<PromptPlan> findAllActive();

    Optional<PromptPlan> findByIdAndDeletedAtIsNull(UUID id);
}
