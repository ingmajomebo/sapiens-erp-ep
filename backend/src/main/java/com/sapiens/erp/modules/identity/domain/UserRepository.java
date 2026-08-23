package com.sapiens.erp.modules.identity.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    boolean existsByEmailAndDeletedAtIsNull(String email);

    @EntityGraph(attributePaths = "userRole")
    List<User> findAllByDeletedAtIsNullOrderByNameAsc();

    @EntityGraph(attributePaths = "userRole")
    Optional<User> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByEmailAndDeletedAtIsNullAndIdNot(String email, UUID id);
}
