package com.sapiens.erp.modules.identity.api.dto;

import com.sapiens.erp.modules.identity.domain.User;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.UUID;

/** Gestión de usuarios del ERP. */
public final class UserDtos {

    private UserDtos() {}

    public record UserResponse(
            UUID id,
            String name,
            String email,
            UUID roleId,
            String roleName,
            boolean enabled,
            Instant lastLogin,
            Instant createdAt
    ) {
        public static UserResponse from(User u) {
            return new UserResponse(
                    u.getId(), u.getName(), u.getEmail(),
                    u.getUserRole() != null ? u.getUserRole().getId() : null,
                    u.getUserRole() != null ? u.getUserRole().getName() : null,
                    u.isEnabled(), u.getLastLogin(), u.getCreatedAt());
        }
    }

    public record CreateUserRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 160) String email,
            /* Mínimo 10: por debajo de eso, una contraseña de oficina se
               adivina en minutos con un diccionario. */
            @NotBlank @Size(min = 10, max = 72) String password,
            @NotNull UUID roleId
    ) {}

    public record UpdateUserRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 160) String email,
            @NotNull UUID roleId,
            @NotNull Boolean enabled
    ) {}

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 10, max = 72) String password
    ) {}
}
