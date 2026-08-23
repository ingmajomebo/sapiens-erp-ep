package com.sapiens.erp.modules.storefront.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Alguien quiere una presentación que está agotada.
 * <p>
 * Deliberadamente fuera del módulo de inventario: inventario registra hechos
 * del almacén y no debe saber que existe una tienda. Cuando haya que avisar,
 * el proceso leerá esta tabla — nunca al revés.
 */
@Entity
@Table(name = "stock_requests")
@Getter
@Setter
@NoArgsConstructor
public class StockRequest extends AuditableEntity {

    @Id
    private UUID id;

    /** La presentación concreta que se espera, no la familia. */
    @Column(name = "product_id", nullable = false)
    private UUID productId;

    /** Null cuando la pide alguien sin cuenta. */
    @Column(name = "account_id")
    private UUID accountId;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(nullable = false, length = 40)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(name = "desired_quantity", precision = 10, scale = 3)
    private BigDecimal desiredQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StockRequestStatus status = StockRequestStatus.WAITING_STOCK;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NotificationChannel channel;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt = Instant.now();

    @Column(name = "notified_at")
    private Instant notifiedAt;
}
