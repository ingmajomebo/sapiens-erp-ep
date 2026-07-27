CREATE TABLE cash_sessions (
    id                UUID            PRIMARY KEY,
    session_number    VARCHAR(30)     NOT NULL UNIQUE,
    opened_by         UUID            NOT NULL REFERENCES users(id),
    closed_by         UUID            REFERENCES users(id),
    opened_at         TIMESTAMPTZ     NOT NULL,
    closed_at         TIMESTAMPTZ,
    opening_balance   NUMERIC(14,4)   NOT NULL DEFAULT 0,
    expected_balance  NUMERIC(14,4),
    counted_balance   NUMERIC(14,4),
    variance          NUMERIC(14,4),
    status            VARCHAR(20)     NOT NULL DEFAULT 'OPEN',
    notes             TEXT,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE SEQUENCE cash_session_seq START 1 INCREMENT 1;
