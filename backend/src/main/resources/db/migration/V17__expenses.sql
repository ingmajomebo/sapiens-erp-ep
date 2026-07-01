CREATE TABLE expenses (
    id                   UUID          NOT NULL PRIMARY KEY,
    category             VARCHAR(50)   NOT NULL,
    amount               NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    expense_date         DATE          NOT NULL,
    description          TEXT          NOT NULL,
    status               VARCHAR(20)   NOT NULL DEFAULT 'REGISTERED'
                             CHECK (status IN ('REGISTERED','RECONCILED')),
    financial_account_id UUID          NOT NULL REFERENCES financial_accounts(id),
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_account ON expenses(financial_account_id);
CREATE INDEX idx_expenses_date    ON expenses(expense_date DESC);
