package com.sapiens.erp.modules.ai.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiContextSettingRepository extends JpaRepository<AiContextSetting, UUID> {
    Optional<AiContextSetting> findBySettingKey(String settingKey);
}
