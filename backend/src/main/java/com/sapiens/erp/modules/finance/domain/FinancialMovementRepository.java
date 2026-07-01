package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FinancialMovementRepository extends JpaRepository<FinancialMovement, UUID> {

    List<FinancialMovement> findByFinancialAccountIdOrderByCreatedAtDesc(UUID accountId);
}
