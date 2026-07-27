-- cash_session_movements: immutable audit log for cash register
-- No soft delete, no update — only INSERT (mirrors inventory_movements invariant)

CREATE TABLE cash_session_movements (
    id              UUID            PRIMARY KEY,
    session_id      UUID            NOT NULL REFERENCES cash_sessions(id),
    movement_type   VARCHAR(30)     NOT NULL,
    direction       VARCHAR(10)     NOT NULL,
    payment_method  VARCHAR(20)     NOT NULL DEFAULT 'CASH',
    amount          NUMERIC(14,4)   NOT NULL,
    reference       VARCHAR(100),
    description     TEXT,
    created_by      UUID            REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_csm_session_id ON cash_session_movements(session_id);
CREATE INDEX idx_csm_created_at ON cash_session_movements(created_at DESC);

-- ── Cash permissions ───────────────────────────────────────────────────────────

INSERT INTO permissions (code, description, module) VALUES
    ('CASH_SESSION_VIEW',    'Ver estado actual y KPIs de la sesión de caja',     'CASH'),
    ('CASH_SESSION_OPEN',    'Abrir una nueva sesión de caja',                    'CASH'),
    ('CASH_MOVEMENT_CREATE', 'Registrar movimientos manuales de caja',            'CASH'),
    ('CASH_SESSION_CLOSE',   'Cerrar la sesión de caja con arqueo',               'CASH'),
    ('CASH_SESSION_HISTORY', 'Consultar el historial de sesiones cerradas',       'CASH');

-- ADMIN: all cash permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions WHERE module = 'CASH';

-- SUPERVISOR: all cash permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions WHERE module = 'CASH';

-- OPERATOR: view, open, manual movement only
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN ('CASH_SESSION_VIEW', 'CASH_SESSION_OPEN', 'CASH_MOVEMENT_CREATE');
