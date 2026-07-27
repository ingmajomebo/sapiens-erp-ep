package com.sapiens.erp.modules.identity.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User extends AuditableEntity {

    @Id
    private UUID id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 100, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private UserRole userRole;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "last_login")
    private Instant lastLogin;

    public static User create(String name, String email, String passwordHash, UserRole userRole) {
        User u = new User();
        u.id = UUID.randomUUID();
        u.name = name;
        u.email = email;
        u.passwordHash = passwordHash;
        u.userRole = userRole;
        u.enabled = true;
        return u;
    }

    public void recordLogin() {
        this.lastLogin = Instant.now();
    }
}
