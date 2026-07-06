package com.sapiens.erp.modules.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface PaymentReceiptRepository extends JpaRepository<PaymentReceipt, UUID> {

    @Query(value = "SELECT nextval('payment_receipt_number_seq')", nativeQuery = true)
    long nextReceiptNumberValue();
}
