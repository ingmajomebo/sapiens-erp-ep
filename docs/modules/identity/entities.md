# Identity — Entidades

## User

Tabla: `users`

| Campo Java | Tipo Java | Columna SQL | Tipo SQL | Restricciones |
|-----------|----------|-------------|---------|--------------|
| `id` | `UUID` | `id` | `UUID PK` | App-generated |
| `name` | `String` | `name` | `VARCHAR(100)` | NOT NULL |
| `email` | `String` | `email` | `VARCHAR(100)` | NOT NULL, índice único parcial (soft-delete aware, case-insensitive) |
| `passwordHash` | `String` | `password_hash` | `VARCHAR(255)` | NOT NULL, BCrypt cost 12 |
| `role` | `Role` (enum) | `role` | `VARCHAR(20)` | NOT NULL, DEFAULT 'OPERATOR', CHECK IN ('ADMIN','SUPERVISOR','OPERATOR') |
| `enabled` | `boolean` | `enabled` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `lastLogin` | `Instant` | `last_login` | `TIMESTAMPTZ` | nullable |
| `createdAt` | `Instant` | `created_at` | `TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at` | `TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at` | `TIMESTAMPTZ` | soft delete |

**Métodos de dominio**:
- `User.create(name, email, passwordHash, role)` → factory estático
- `user.recordLogin()` → actualiza `lastLogin = Instant.now()`
- `user.softDelete()` → hereda de `AuditableEntity`

## RefreshToken

Tabla: `refresh_tokens`

| Campo Java | Tipo Java | Columna SQL | Tipo SQL | Restricciones |
|-----------|----------|-------------|---------|--------------|
| `id` | `UUID` | `id` | `UUID PK` | App-generated |
| `user` | `User` | `user_id` | `UUID FK → users(id)` | NOT NULL, ON DELETE RESTRICT |
| `tokenHash` | `String` | `token_hash` | `VARCHAR(255)` | NOT NULL, UNIQUE (SHA-256 del token crudo) |
| `expiresAt` | `Instant` | `expires_at` | `TIMESTAMPTZ` | NOT NULL |
| `revokedAt` | `Instant` | `revoked_at` | `TIMESTAMPTZ` | nullable — NULL = activo |
| `createdAt` | `Instant` | `created_at` | `TIMESTAMPTZ` | NOT NULL, immutable |

**Métodos de dominio**:
- `RefreshToken.create(user, tokenHash, expiresAt)` → factory estático
- `rt.isValid()` → `revokedAt == null && expiresAt.isAfter(Instant.now())`
- `rt.revoke()` → `revokedAt = Instant.now()`

## Role (Enum)

```java
public enum Role {
    ADMIN, SUPERVISOR, OPERATOR
}
```
