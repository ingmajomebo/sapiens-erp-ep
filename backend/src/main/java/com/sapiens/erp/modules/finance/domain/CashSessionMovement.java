package com.sapiens.erp.modules.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Immutable audit log entry for the cash register — only INSERT, never UPDATE or DELETE. */
@Entity
@Table(name = "cash_session_movements")
@Getter
@NoArgsConstructor
public class CashSessionMovement {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private CashSession session;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 30)
    private CashMovementType movementType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CashMovementDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private CashPaymentMethod paymentMethod;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    @Column(length = 100)
    private String reference;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static CashSessionMovement create(CashSession session, CashMovementType type,
            CashMovementDirection direction, CashPaymentMethod paymentMethod,
            BigDecimal amount, String reference, String description, UUID createdBy) {
        CashSessionMovement m = new CashSessionMovement();
        m.id = UUID.randomUUID();
        m.session = session;
        m.movementType = type;
        m.direction = direction;
        m.paymentMethod = paymentMethod;
        m.amount = amount;
        m.reference = reference;
        m.description = description;
        m.createdBy = createdBy;
        m.createdAt = Instant.now();
        return m;
    }
}
