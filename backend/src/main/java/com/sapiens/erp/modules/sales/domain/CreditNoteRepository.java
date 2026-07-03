package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreditNoteRepository extends JpaRepository<CreditNote, UUID> {

    @Query("""
        SELECT n FROM CreditNote n
        WHERE n.deletedAt IS NULL AND n.invoice.id = :invoiceId
        ORDER BY n.issuedAt DESC
        """)
    List<CreditNote> findByInvoiceId(@Param("invoiceId") UUID invoiceId);

    Optional<CreditNote> findByIdAndDeletedAtIsNull(UUID id);

    @Query(value = "SELECT nextval('credit_note_number_seq')", nativeQuery = true)
    long nextNoteNumberValue();
}
