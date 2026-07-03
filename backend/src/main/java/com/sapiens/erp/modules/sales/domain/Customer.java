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

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 150)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    public static Customer create(String name, String email, String phone, boolean anonymous) {
        Customer c = new Customer();
        c.id = UUID.randomUUID();
        c.name = name;
        c.email = email;
        c.phone = phone;
        c.anonymous = anonymous;
        return c;
    }

    public static Customer anonymous(String contactName, String email, String phone) {
        return create(contactName != null && !contactName.isBlank() ? contactName.trim() : "Cliente anónimo",
                email, phone, true);
    }
}
