package com.sapiens.erp.modules.sales.domain;

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
@Table(name = "sales_orders")
@Getter
@Setter
@NoArgsConstructor
public class SalesOrder extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "order_number", length = 20, nullable = false, unique = true)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(length = 10, nullable = false)
    private SalesChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private SalesOrderStatus status;

    /** Email del usuario del ERP que registró el pedido (null en canal público). */
    @Column(name = "created_by", length = 150)
    private String createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "link_id")
    private SalesOrderLink link;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", length = 10, nullable = false)
    private DeliveryMethod deliveryMethod = DeliveryMethod.PICKUP;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    /** Novedad registrada al cancelar el pedido. */
    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesOrderLine> lines = new ArrayList<>();

    public static SalesOrder create(String orderNumber, Customer customer, SalesChannel channel,
                                    String createdBy, SalesOrderLink link, String notes,
                                    DeliveryMethod deliveryMethod, String deliveryAddress) {
        SalesOrder so = new SalesOrder();
        so.id = UUID.randomUUID();
        so.orderNumber = orderNumber;
        so.customer = customer;
        so.channel = channel;
        so.status = SalesOrderStatus.PENDING;
        so.createdBy = createdBy;
        so.link = link;
        so.notes = notes;
        so.deliveryMethod = deliveryMethod != null ? deliveryMethod : DeliveryMethod.PICKUP;
        so.deliveryAddress = deliveryAddress;
        return so;
    }

    public void cancel(String reason) {
        if (!status.canTransitionTo(SalesOrderStatus.CANCELLED)) {
            throw new IllegalArgumentException("El pedido no puede cancelarse en estado " + status);
        }
        this.status = SalesOrderStatus.CANCELLED;
        this.cancelReason = reason;
    }

    public void addLine(SalesOrderLine line) {
        line.setSalesOrder(this);
        lines.add(line);
    }

    public BigDecimal total() {
        return lines.stream()
                .map(SalesOrderLine::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void transitionTo(SalesOrderStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new IllegalArgumentException("Transición no permitida: " + status + " → " + target);
        }
        this.status = target;
    }
}
