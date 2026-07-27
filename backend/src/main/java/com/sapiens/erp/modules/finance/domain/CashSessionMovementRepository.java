package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public interface CashSessionMovementRepository extends JpaRepository<CashSessionMovement, UUID> {

    Page<CashSessionMovement> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.direction = com.sapiens.erp.modules.finance.domain.CashMovementDirection.IN " +
           "AND m.paymentMethod = com.sapiens.erp.modules.finance.domain.CashPaymentMethod.CASH")
    BigDecimal sumCashIn(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.direction = com.sapiens.erp.modules.finance.domain.CashMovementDirection.OUT " +
           "AND m.paymentMethod = com.sapiens.erp.modules.finance.domain.CashPaymentMethod.CASH")
    BigDecimal sumCashOut(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.movementType = com.sapiens.erp.modules.finance.domain.CashMovementType.SALE " +
           "AND m.direction = com.sapiens.erp.modules.finance.domain.CashMovementDirection.IN")
    BigDecimal sumTotalSales(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.movementType = com.sapiens.erp.modules.finance.domain.CashMovementType.AP_PAYMENT")
    BigDecimal sumApPayments(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.movementType = com.sapiens.erp.modules.finance.domain.CashMovementType.EXPENSE")
    BigDecimal sumExpenses(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.movementType = com.sapiens.erp.modules.finance.domain.CashMovementType.MANUAL_INCOME")
    BigDecimal sumManualIn(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid AND m.movementType = com.sapiens.erp.modules.finance.domain.CashMovementType.MANUAL_EXPENSE")
    BigDecimal sumManualOut(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid " +
           "AND m.paymentMethod = com.sapiens.erp.modules.finance.domain.CashPaymentMethod.CARD " +
           "AND m.direction = com.sapiens.erp.modules.finance.domain.CashMovementDirection.IN")
    BigDecimal sumCardIn(@Param("sid") UUID sessionId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashSessionMovement m " +
           "WHERE m.session.id = :sid " +
           "AND m.paymentMethod = com.sapiens.erp.modules.finance.domain.CashPaymentMethod.TRANSFER " +
           "AND m.direction = com.sapiens.erp.modules.finance.domain.CashMovementDirection.IN")
    BigDecimal sumTransferIn(@Param("sid") UUID sessionId);

    long countBySessionId(UUID sessionId);
}
