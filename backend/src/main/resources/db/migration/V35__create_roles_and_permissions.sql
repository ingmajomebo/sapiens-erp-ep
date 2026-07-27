-- Roles, permissions, and role-permission assignment tables

CREATE TABLE roles (
    id          UUID PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(200),
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE permissions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(80)  NOT NULL UNIQUE,
    description VARCHAR(200),
    module      VARCHAR(40)  NOT NULL
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- ── Permission catalog ────────────────────────────────────────────────────────

INSERT INTO permissions (code, description, module) VALUES
    -- Catalog
    ('CATALOG_VIEW',             'Ver catálogo de productos y categorías',       'CATALOG'),
    ('CATALOG_PRODUCT_CREATE',   'Crear nuevos productos',                        'CATALOG'),
    ('CATALOG_PRODUCT_EDIT',     'Editar productos existentes',                   'CATALOG'),
    ('CATALOG_PRODUCT_DELETE',   'Eliminar productos',                            'CATALOG'),
    ('CATALOG_CATEGORY_MANAGE',  'Gestionar categorías',                          'CATALOG'),
    -- Inventory
    ('INVENTORY_VIEW',             'Ver inventario y stock',                      'INVENTORY'),
    ('INVENTORY_MOVEMENT_CREATE',  'Registrar entradas y salidas de inventario',  'INVENTORY'),
    ('INVENTORY_ADJUSTMENT',       'Realizar ajustes de inventario',              'INVENTORY'),
    ('INVENTORY_SHRINKAGE',        'Registrar mermas',                            'INVENTORY'),
    ('INVENTORY_WAREHOUSE_MANAGE', 'Gestionar bodegas',                           'INVENTORY'),
    -- Procurement
    ('PROCUREMENT_VIEW',            'Ver proveedores y órdenes de compra',        'PROCUREMENT'),
    ('PROCUREMENT_ORDER_CREATE',    'Crear órdenes de compra',                    'PROCUREMENT'),
    ('PROCUREMENT_ORDER_APPROVE',   'Confirmar y cancelar órdenes de compra',     'PROCUREMENT'),
    ('PROCUREMENT_RECEIVE',         'Recepcionar mercancía de órdenes de compra', 'PROCUREMENT'),
    ('PROCUREMENT_SUPPLIER_MANAGE', 'Gestionar proveedores',                      'PROCUREMENT'),
    -- Sales
    ('SALES_VIEW',             'Ver ventas y clientes',                           'SALES'),
    ('SALES_ORDER_CREATE',     'Crear y gestionar pedidos de venta',              'SALES'),
    ('SALES_ORDER_APPROVE',    'Aprobar y anular operaciones de venta',           'SALES'),
    ('SALES_INVOICE_MANAGE',   'Gestionar facturas de venta y pagos',             'SALES'),
    ('SALES_CUSTOMER_MANAGE',  'Gestionar clientes',                              'SALES'),
    -- Finance
    ('FINANCE_VIEW',               'Ver cuentas y movimientos financieros',       'FINANCE'),
    ('FINANCE_CASH_OPEN_CLOSE',    'Abrir y cerrar sesiones de caja',             'FINANCE'),
    ('FINANCE_PAYMENT_REGISTER',   'Registrar pagos a proveedores y recibos de caja', 'FINANCE'),
    ('FINANCE_ACCOUNT_MANAGE',     'Gestionar cuentas bancarias y de caja',       'FINANCE'),
    ('FINANCE_RECEIVABLES_MANAGE', 'Gestionar cuentas por cobrar',                'FINANCE'),
    -- Reports
    ('REPORTS_VIEW', 'Ver reportes del sistema', 'REPORTS'),
    -- Identity
    ('IDENTITY_USER_MANAGE', 'Gestionar usuarios del sistema',         'IDENTITY'),
    ('IDENTITY_ROLE_MANAGE',  'Gestionar roles y permisos configurables','IDENTITY'),
    ('IDENTITY_DATA_RESET',   'Resetear datos del sistema',             'IDENTITY');

-- ── System roles ──────────────────────────────────────────────────────────────

INSERT INTO roles (id, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ADMIN',
     'Administrador con acceso total al sistema', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'SUPERVISOR',
     'Supervisor con acceso a todas las operaciones de negocio', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'OPERATOR',
     'Operador con acceso a tareas básicas del día a día', TRUE);

-- ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions;

-- SUPERVISOR: all except identity management
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id
FROM permissions WHERE module <> 'IDENTITY';

-- OPERATOR: basic day-to-day operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id
FROM permissions
WHERE code IN (
    'CATALOG_VIEW',
    'INVENTORY_VIEW', 'INVENTORY_MOVEMENT_CREATE',
    'PROCUREMENT_VIEW', 'PROCUREMENT_RECEIVE',
    'SALES_VIEW', 'SALES_ORDER_CREATE', 'SALES_INVOICE_MANAGE', 'SALES_CUSTOMER_MANAGE',
    'FINANCE_VIEW', 'FINANCE_CASH_OPEN_CLOSE',
    'REPORTS_VIEW'
);

-- ── Link users to the new role system ────────────────────────────────────────

ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);

UPDATE users SET role_id = '00000000-0000-0000-0000-000000000001' WHERE role = 'ADMIN';
UPDATE users SET role_id = '00000000-0000-0000-0000-000000000002' WHERE role = 'SUPERVISOR';
UPDATE users SET role_id = '00000000-0000-0000-0000-000000000003' WHERE role = 'OPERATOR';
