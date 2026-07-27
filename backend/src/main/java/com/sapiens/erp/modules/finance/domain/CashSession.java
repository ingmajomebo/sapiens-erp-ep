package com.sapiens.erp.modules.finance.domain;

import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cash_sessions")
@Getter
@Setter
@NoArgsConstructor
public class CashSession extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "session_number", nullable = false, length = 30)
    private String sessionNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opened_by", nullable = false)
    private User openedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "opening_balance", nullable = false, precision = 14, scale = 4)
    private BigDecimal openingBalance;

    @Column(name = "expected_balance", precision = 14, scale = 4)
    private BigDecimal expectedBalance;

    @Column(name = "counted_balance", precision = 14, scale = 4)
    private BigDecimal countedBalance;

    @Column(precision = 14, scale = 4)
    private BigDecimal variance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashSessionStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static CashSession open(User openedBy, BigDecimal openingBalance, String notes, String sessionNumber) {
        CashSession s = new CashSession();
        s.id = UUID.randomUUID();
        s.sessionNumber = sessionNumber;
        s.openedBy = openedBy;
        s.openedAt = Instant.now();
        s.openingBalance = openingBalance != null ? openingBalance : BigDecimal.ZERO;
        s.status = CashSessionStatus.OPEN;
        s.notes = notes;
        return s;
    }

    public void close(User closedBy, BigDecimal expectedBalance, BigDecimal countedBalance, String notes) {
        this.closedBy = closedBy;
        this.closedAt = Instant.now();
        this.expectedBalance = expectedBalance;
        this.countedBalance = countedBalance;
        this.variance = countedBalance.subtract(expectedBalance);
        this.status = CashSessionStatus.CLOSED;
        if (notes != null && !notes.isBlank()) this.notes = notes;
    }
}
