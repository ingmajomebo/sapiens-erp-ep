package com.sapiens.erp.modules.sales.domain.einvoicing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ElectronicInvoiceDocumentRepository
        extends JpaRepository<ElectronicInvoiceDocument, UUID> {

    Optional<ElectronicInvoiceDocument> findByInvoiceIdAndDeletedAtIsNull(UUID invoiceId);

    /** Para pintar el estado en el listado sin una consulta por fila. */
    @Query("SELECT d FROM ElectronicInvoiceDocument d "
            + "WHERE d.invoice.id IN :invoiceIds AND d.deletedAt IS NULL")
    List<ElectronicInvoiceDocument> findByInvoiceIds(@Param("invoiceIds") Collection<UUID> invoiceIds);

    @Query("SELECT d FROM ElectronicInvoiceDocument d "
            + "WHERE d.status IN :statuses AND d.deletedAt IS NULL "
            + "ORDER BY d.createdAt ASC")
    List<ElectronicInvoiceDocument> findByStatuses(
            @Param("statuses") Collection<ElectronicInvoiceStatus> statuses);
}
