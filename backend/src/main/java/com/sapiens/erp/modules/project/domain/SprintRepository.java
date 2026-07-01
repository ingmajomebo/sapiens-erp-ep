package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SprintRepository extends JpaRepository<Sprint, UUID> {

    @Query("SELECT s FROM Sprint s WHERE s.deletedAt IS NULL ORDER BY s.startDate DESC")
    List<Sprint> findAllActive();

    Optional<Sprint> findByIdAndDeletedAtIsNull(UUID id);

    @Query("SELECT s FROM Sprint s WHERE s.status = 'ACTIVE' AND s.deletedAt IS NULL ORDER BY s.startDate DESC")
    List<Sprint> findActiveSprints();
}
