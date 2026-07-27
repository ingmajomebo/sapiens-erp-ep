package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinancialAccountRepository extends JpaRepository<FinancialAccount, UUID> {

    @Query("SELECT a FROM FinancialAccount a WHERE a.deletedAt IS NULL ORDER BY a.name ASC")
    List<FinancialAccount> findAllActive();

    Optional<FinancialAccount> findByIdAndDeletedAtIsNull(UUID id);

    @Query("SELECT a FROM FinancialAccount a WHERE a.accountType = com.sapiens.erp.modules.finance.domain.FinancialAccountType.CASH " +
           "AND a.status = com.sapiens.erp.modules.finance.domain.FinancialAccountStatus.ACTIVE " +
           "AND a.deletedAt IS NULL ORDER BY a.createdAt ASC LIMIT 1")
    Optional<FinancialAccount> findFirstActiveCashAccount();
}
