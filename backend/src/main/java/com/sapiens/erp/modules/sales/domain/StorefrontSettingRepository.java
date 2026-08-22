package com.sapiens.erp.modules.sales.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StorefrontSettingRepository extends JpaRepository<StorefrontSetting, UUID> {

    List<StorefrontSetting> findAllByDeletedAtIsNull();

    Optional<StorefrontSetting> findBySettingKeyAndDeletedAtIsNull(String settingKey);
}
