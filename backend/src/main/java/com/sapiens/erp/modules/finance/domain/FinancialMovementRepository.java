package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FinancialMovementRepository extends JpaRepository<FinancialMovement, UUID> {

    List<FinancialMovement> findByFinancialAccountIdOrderByCreatedAtDesc(UUID accountId);

    @Query("""
            SELECT m FROM FinancialMovement m
            JOIN FETCH m.financialAccount a
            WHERE a.deletedAt IS NULL
            ORDER BY m.createdAt DESC
            LIMIT :limit
            """)
    List<FinancialMovement> findRecentMovements(@Param("limit") int limit);
}
