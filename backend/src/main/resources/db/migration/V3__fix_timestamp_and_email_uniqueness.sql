-- V3: Corrige tipos TIMESTAMP → TIMESTAMPTZ en todas las tablas
--     y reemplaza el UNIQUE constraint de email por índice parcial (soft-delete aware)

-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────
ALTER TABLE users
    ALTER COLUMN last_login  TYPE TIMESTAMPTZ USING last_login  AT TIME ZONE 'UTC',
    ALTER COLUMN deleted_at  TYPE TIMESTAMPTZ USING deleted_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at  TYPE TIMESTAMPTZ USING updated_at  AT TIME ZONE 'UTC';

-- El UNIQUE constraint sobre email bloquea el email incluso tras soft-delete.
-- Se reemplaza por índice único parcial que solo aplica a usuarios activos.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX uq_users_email_active ON users (LOWER(email)) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- refresh_tokens
-- ─────────────────────────────────────────────
ALTER TABLE refresh_tokens
    ALTER COLUMN expires_at  TYPE TIMESTAMPTZ USING expires_at  AT TIME ZONE 'UTC',
    ALTER COLUMN revoked_at  TYPE TIMESTAMPTZ USING revoked_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC';

-- ─────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────
ALTER TABLE categories
    ALTER COLUMN deleted_at  TYPE TIMESTAMPTZ USING deleted_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at  TYPE TIMESTAMPTZ USING updated_at  AT TIME ZONE 'UTC';

-- ─────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────
ALTER TABLE products
    ALTER COLUMN deleted_at  TYPE TIMESTAMPTZ USING deleted_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at  TYPE TIMESTAMPTZ USING updated_at  AT TIME ZONE 'UTC';
