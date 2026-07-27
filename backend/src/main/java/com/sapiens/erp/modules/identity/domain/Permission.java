package com.sapiens.erp.modules.identity.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "permissions")
@Getter
@NoArgsConstructor
public class Permission {

    @Id
    private UUID id;

    @Column(length = 80, nullable = false, unique = true)
    private String code;

    @Column(length = 200)
    private String description;

    @Column(length = 40, nullable = false)
    private String module;
}
