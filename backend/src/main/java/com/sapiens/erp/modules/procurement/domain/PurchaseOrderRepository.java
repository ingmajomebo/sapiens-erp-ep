package com.sapiens.erp.modules.procurement.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    @Query("SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.lines l LEFT JOIN FETCH l.product LEFT JOIN FETCH po.supplier WHERE po.id = :id AND po.deletedAt IS NULL")
    Optional<PurchaseOrder> findByIdWithLines(@Param("id") UUID id);

    @Query("SELECT po FROM PurchaseOrder po LEFT JOIN FETCH po.supplier WHERE po.deletedAt IS NULL ORDER BY po.createdAt DESC")
    List<PurchaseOrder> findAllActive();

    @Query(value = "SELECT NEXTVAL('po_number_seq')", nativeQuery = true)
    Long nextOrderNumber();
}
