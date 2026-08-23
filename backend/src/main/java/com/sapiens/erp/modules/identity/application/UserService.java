package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.api.dto.UserDtos.*;
import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.identity.domain.UserRole;
import com.sapiens.erp.modules.identity.domain.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Alta y mantenimiento de los usuarios del ERP.
 * <p>
 * El primer administrador lo crea {@code DataInitializer} a partir de
 * ADMIN_EMAIL y ADMIN_PASSWORD. Desde ahí, es él quien da de alta al resto:
 * así las credenciales de las personas nunca pasan por un archivo de
 * configuración ni por el pipeline.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> listAll() {
        return userRepository.findAllByDeletedAtIsNullOrderByNameAsc()
                .stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest req) {
        String email = normalize(req.email());
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new IllegalArgumentException("Ya existe un usuario con el correo " + email);
        }
        User user = User.create(req.name().trim(), email,
                passwordEncoder.encode(req.password()), resolveRole(req.roleId()));
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest req) {
        User user = require(id);
        String email = normalize(req.email());
        if (userRepository.existsByEmailAndDeletedAtIsNullAndIdNot(email, id)) {
            throw new IllegalArgumentException("Ya existe otro usuario con el correo " + email);
        }

        // Quedarse sin ningún administrador activo deja el sistema sin quien
        // pueda repararlo. Se impide antes de guardar, no después.
        boolean pierdeAdmin = user.getUserRole() != null
                && "ADMIN".equals(user.getUserRole().getName())
                && (!req.enabled() || !user.getUserRole().getId().equals(req.roleId()));
        if (pierdeAdmin && contarAdminsActivos() <= 1) {
            throw new IllegalArgumentException(
                    "Es el único administrador activo: asigna otro antes de cambiarlo o desactivarlo");
        }

        user.setName(req.name().trim());
        user.setEmail(email);
        user.setUserRole(resolveRole(req.roleId()));
        user.setEnabled(req.enabled());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(UUID id, ResetPasswordRequest req) {
        User user = require(id);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        userRepository.save(user);
    }

    /** Baja lógica: el usuario deja de entrar pero su historial se conserva. */
    @Transactional
    public void deactivate(UUID id) {
        User user = require(id);
        if (user.getUserRole() != null && "ADMIN".equals(user.getUserRole().getName())
                && contarAdminsActivos() <= 1) {
            throw new IllegalArgumentException(
                    "Es el único administrador activo: no se puede eliminar");
        }
        user.setEnabled(false);
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
    }

    /* ── Apoyo ───────────────────────────────────────────────────────────── */

    private long contarAdminsActivos() {
        return userRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
                .filter(User::isEnabled)
                .filter(u -> u.getUserRole() != null && "ADMIN".equals(u.getUserRole().getName()))
                .count();
    }

    private User require(UUID id) {
        return userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
    }

    private UserRole resolveRole(UUID roleId) {
        return roleRepository.findById(roleId)
                .filter(r -> r.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + roleId));
    }

    private String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
