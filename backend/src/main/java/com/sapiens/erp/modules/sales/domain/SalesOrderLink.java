package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Enlace público de pedido: lo genera y administra la empresa, no el cliente. */
@Entity
@Table(name = "sales_order_links")
@Getter
@Setter
@NoArgsConstructor
public class SalesOrderLink extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(length = 100)
    private String label;

    @Column(name = "active", nullable = false)
    private boolean enabled = true;

    public static SalesOrderLink create(String label) {
        SalesOrderLink l = new SalesOrderLink();
        l.id = UUID.randomUUID();
        l.token = UUID.randomUUID().toString().replace("-", "");
        l.label = label;
        l.enabled = true;
        return l;
    }
}
