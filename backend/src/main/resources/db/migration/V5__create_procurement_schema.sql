CREATE TABLE suppliers (
    id           UUID         PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    email        VARCHAR(150),
    phone        VARCHAR(30),
    address      TEXT,
    tax_id       VARCHAR(50),
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    deleted_at   TIMESTAMPTZ
);
