package com.sapiens.erp.modules.ai.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_context_settings")
@Getter
@NoArgsConstructor
public class AiContextSetting {

    @Id
    private UUID id;

    @Column(name = "setting_key", nullable = false, unique = true)
    private String settingKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column
    private String label;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void updateContent(String newContent) {
        this.content = newContent;
        this.updatedAt = Instant.now();
    }
}
