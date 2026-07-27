package com.sapiens.erp.modules.identity.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

    Optional<UserRole> findByNameAndDeletedAtIsNull(String name);

    List<UserRole> findAllByDeletedAtIsNullOrderByName();

    @Query("SELECT COUNT(u) FROM User u WHERE u.userRole.id = :roleId AND u.deletedAt IS NULL")
    long countUsersByRoleId(@Param("roleId") UUID roleId);
}
