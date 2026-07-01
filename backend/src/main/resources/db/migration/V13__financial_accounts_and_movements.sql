-- Cuentas financieras (cajas, bancos, billeteras digitales)
CREATE TABLE financial_accounts (
    id              UUID          PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    account_type    VARCHAR(30)   NOT NULL,  -- CASH | BANK | DIGITAL_WALLET
    initial_balance NUMERIC(14,4) NOT NULL DEFAULT 0,
    current_balance NUMERIC(14,4) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | INACTIVE
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Movimientos de cada cuenta financiera
CREATE TABLE financial_movements (
    id                    UUID          PRIMARY KEY,
    financial_account_id  UUID          NOT NULL REFERENCES financial_accounts(id),
    movement_type         VARCHAR(20)   NOT NULL,  -- INCOME | EXPENSE
    concept               VARCHAR(255)  NOT NULL,
    amount                NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    balance_before        NUMERIC(14,4) NOT NULL,
    balance_after         NUMERIC(14,4) NOT NULL,
    related_document      VARCHAR(100),
    related_entity_id     UUID,
    movement_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_movements_account ON financial_movements(financial_account_id);
CREATE INDEX idx_financial_movements_date    ON financial_movements(movement_date);

-- FK de supplier_payments hacia financial_accounts (nullable para compatibilidad)
ALTER TABLE supplier_payments
    ADD COLUMN IF NOT EXISTS financial_account_id UUID REFERENCES financial_accounts(id);

-- Cuentas iniciales por defecto
INSERT INTO financial_accounts (id, name, account_type, initial_balance, current_balance, status)
VALUES
    (gen_random_uuid(), 'Caja principal',  'CASH', 0, 0, 'ACTIVE'),
    (gen_random_uuid(), 'Caja menor',      'CASH', 0, 0, 'ACTIVE');
