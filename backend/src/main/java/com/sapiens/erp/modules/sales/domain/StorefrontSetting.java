package com.sapiens.erp.modules.sales.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Un texto editable de la página pública de pedidos. */
@Entity
@Table(name = "storefront_settings")
@Getter
@Setter
@NoArgsConstructor
public class StorefrontSetting extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "setting_key", nullable = false, unique = true, length = 60)
    private String settingKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    public static StorefrontSetting create(String settingKey, String content) {
        StorefrontSetting s = new StorefrontSetting();
        s.id = UUID.randomUUID();
        s.settingKey = settingKey;
        s.content = content;
        return s;
    }
}
