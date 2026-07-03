package com.sapiens.erp.modules.project.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EpicRepository extends JpaRepository<Epic, UUID> {

    List<Epic> findAllByDeletedAtIsNullOrderByCodeAsc();

    Optional<Epic> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByCodeAndDeletedAtIsNull(String code);
}
