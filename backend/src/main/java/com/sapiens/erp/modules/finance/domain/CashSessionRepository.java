package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface CashSessionRepository extends JpaRepository<CashSession, UUID> {

    Optional<CashSession> findFirstByStatusAndDeletedAtIsNull(CashSessionStatus status);

    boolean existsByStatusAndDeletedAtIsNull(CashSessionStatus status);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(s.sessionNumber, 9) AS int)), 0) FROM CashSession s WHERE s.deletedAt IS NULL")
    int findMaxSessionSequence();

    Page<CashSession> findAllByDeletedAtIsNullOrderByOpenedAtDesc(Pageable pageable);
}
