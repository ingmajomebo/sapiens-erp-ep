package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QaExecutionAttachmentRepository extends JpaRepository<QaExecutionAttachment, UUID> {

    Optional<QaExecutionAttachment> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
        SELECT a FROM QaExecutionAttachment a
        WHERE a.deletedAt IS NULL
          AND a.execution.id IN :executionIds
        """)
    List<QaExecutionAttachment> findByExecutionIds(@Param("executionIds") List<UUID> executionIds);
}
