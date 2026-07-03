package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    List<Customer> findAllByDeletedAtIsNullOrderByNameAsc();

    Optional<Customer> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByDocumentTypeAndDocumentNumberAndDeletedAtIsNull(DocumentType documentType, String documentNumber);

    boolean existsByDocumentTypeAndDocumentNumberAndIdNotAndDeletedAtIsNull(DocumentType documentType, String documentNumber, UUID id);
}
