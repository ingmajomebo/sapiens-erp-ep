---
tags: [identity, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Usuario (Clase: `User`)

**Módulo**: [[modules/identity/module]]
**Tipo**: Aggregate Root

> **Convención**: nombres en código (tabla, columnas, clase Java) en inglés. La documentación y el lenguaje ubicuo permanecen en español.

## Atributos

| Campo DB | Columna SQL | Campo Java | Tipo Java | Descripción |
|----------|-------------|------------|-----------|-------------|
| id | `id` | `id` | `UUID` | Clave primaria |
| nombre | `name` | `name` | `String` | Nombre completo |
| email | `email` | `email` | `String` | Email (único, usado para login) |
| contraseña | `password_hash` | `passwordHash` | `String` | BCrypt hash — nunca exponer en API |
| rol | `role` | `role` | `Role` | `ADMIN`, `SUPERVISOR`, `OPERATOR` |
| habilitado | `enabled` | `enabled` | `boolean` | Soft disable |
| fecha de baja | `deleted_at` | `deletedAt` | `Instant` | Soft delete |
| último login | `last_login` | `lastLogin` | `Instant` | Última autenticación exitosa |
| creado en | `created_at` | `createdAt` | `Instant` | Auditoría |
| actualizado en | `updated_at` | `updatedAt` | `Instant` | Auditoría |

## Enum: `Role`

```java
public enum Role {
    ADMIN, SUPERVISOR, OPERATOR
}
```

## Reglas

- `email` es el identificador de login — único en el sistema
- `passwordHash` **nunca** se incluye en ningún DTO de respuesta
- Un usuario con `enabled = false` no puede autenticarse
- Solo `ADMIN` puede cambiar el `role` de otro usuario

## Tabla en BD

```sql
CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'OPERATOR'
                               CHECK (role IN ('ADMIN', 'SUPERVISOR', 'OPERATOR')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMP,
    deleted_at    TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## DTOs

- `LoginRequest` — solo `email` y `password`
- `LoginResponse` — accessToken, refreshToken, userId, name, role
- `UserResponse` — sin `passwordHash`, sin `deletedAt`
- `CreateUserRequest` — name, email, password, role
- `UpdateUserRequest` — name, role, enabled

## Ver también

- [[modules/identity/module]]
- [[architecture/security]]
