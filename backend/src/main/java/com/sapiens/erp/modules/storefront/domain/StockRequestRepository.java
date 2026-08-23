package com.sapiens.erp.modules.storefront.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockRequestRepository extends JpaRepository<StockRequest, UUID> {

    /** Evita duplicar la solicitud del mismo teléfono para el mismo producto. */
    Optional<StockRequest> findByProductIdAndPhoneAndStatusAndDeletedAtIsNull(
            UUID productId, String phone, StockRequestStatus status);

    List<StockRequest> findAllByProductIdAndStatusAndDeletedAtIsNull(
            UUID productId, StockRequestStatus status);
}
