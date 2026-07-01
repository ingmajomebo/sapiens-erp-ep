package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, UUID> {

    @Query("SELECT p FROM SupplierPayment p WHERE p.accountsPayable.id = :apId ORDER BY p.createdAt DESC")
    List<SupplierPayment> findByAccountsPayableId(UUID apId);
}
