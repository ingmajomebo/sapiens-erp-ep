package com.sapiens.erp.modules.procurement.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_receipts")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseReceipt extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseReceiptLine> lines = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static PurchaseReceipt create(PurchaseOrder po, String notes) {
        PurchaseReceipt r = new PurchaseReceipt();
        r.id = UUID.randomUUID();
        r.purchaseOrder = po;
        r.notes = notes;
        return r;
    }

    public void addLine(PurchaseReceiptLine line) {
        line.setReceipt(this);
        lines.add(line);
    }

    public BigDecimal totalReceived() {
        return lines.stream()
                .map(PurchaseReceiptLine::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
