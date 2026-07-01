package com.sapiens.erp.modules.procurement.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "suppliers")
@Getter
@Setter
@NoArgsConstructor
public class Supplier extends AuditableEntity {

    @Id
    private UUID id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(length = 150)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public static Supplier create(String name, String contactName, String email,
                                   String phone, String address, String taxId, String notes) {
        Supplier s = new Supplier();
        s.id = UUID.randomUUID();
        s.name = name;
        s.contactName = contactName;
        s.email = email;
        s.phone = phone;
        s.address = address;
        s.taxId = taxId;
        s.notes = notes;
        return s;
    }
}
