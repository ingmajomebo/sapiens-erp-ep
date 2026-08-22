package com.sapiens.erp.modules.storefront.domain;

import com.sapiens.erp.modules.sales.domain.Customer;
import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Cuenta de un cliente de la tienda.
 * <p>
 * Deliberadamente separada de {@code User}: un cliente no es personal del ERP
 * y su token nunca debe abrir el panel administrativo. La relación con
 * {@link Customer} es la que conecta la cuenta con su historial comercial.
 */
@Entity
@Table(name = "storefront_accounts")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontAccount extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 40)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    public static StorefrontAccount create(String email, String passwordHash,
                                           String name, String phone) {
        StorefrontAccount a = new StorefrontAccount();
        a.id = UUID.randomUUID();
        a.email = email.trim().toLowerCase();
        a.passwordHash = passwordHash;
        a.name = name.trim();
        a.phone = phone != null && !phone.isBlank() ? phone.trim() : null;
        return a;
    }
}
