# Identity — Base de Datos

## Tablas

### `users` (V1 + V3)

Creada en V1; columnas convertidas a `TIMESTAMPTZ` en V3; índice de email reemplazado en V3.

**Índices:**
- `uq_users_email_active ON (LOWER(email)) WHERE deleted_at IS NULL` — garantiza unicidad de email solo entre usuarios activos

### `refresh_tokens` (V1 + V3)

**Índices:**
- `idx_refresh_tokens_user_id ON (user_id)`
- `idx_refresh_tokens_token_hash ON (token_hash)` — permite lookup O(log n) en cada validación

## Notas

- La tabla `users` no tiene un UNIQUE constraint directo sobre `email`; lo reemplaza el índice parcial de V3. Esto permite reutilizar el email de un usuario eliminado (soft-deleted).
- Los refresh tokens nunca se eliminan físicamente; se marcan `revoked_at`. Esto permite auditoría completa de sesiones.
