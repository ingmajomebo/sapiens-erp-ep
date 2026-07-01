# Base de Datos — Sapiens ERP

## Motor y configuración

- **Motor**: PostgreSQL 16
- **Base de datos**: `sapiens_erp`
- **Usuario**: `sapiens` (configurable vía `DB_USER`)
- **Migraciones**: Flyway — `classpath:db/migration`, `baseline-on-migrate: true`
- **DDL automático**: `ddl-auto: validate` — nunca genera ni altera tablas; solo valida contra el esquema Flyway

## Historial de migraciones

| Versión | Archivo | Descripción |
|---------|---------|-------------|
| V1 | `V1__create_identity_schema.sql` | Tablas `users`, `refresh_tokens` |
| V2 | `V2__create_catalog_schema.sql` | Tablas `categories`, `products` |
| V3 | `V3__fix_timestamp_and_email_uniqueness.sql` | Convierte TIMESTAMP → TIMESTAMPTZ en todas las tablas; índice parcial en email |
| V4 | `V4__create_inventory_schema.sql` | Tablas `lots`, `inventory_movements`, `movement_lots` + reglas de inmutabilidad |
| V5 | `V5__create_procurement_schema.sql` | Tabla `suppliers` |
| V6 | `V6__create_purchase_orders_schema.sql` | Tablas `purchase_orders`, `purchase_order_lines` + secuencia `po_number_seq` |
| V7 | `V7__extend_product_and_purchase_order_lines.sql` | Nuevas columnas en `products` (SKU, tipo, costos, estado); descuento por línea |
| V8 | `V8__create_accounts_payable.sql` | Tabla `accounts_payable` |
| V9 | `V9__add_cost_fields.sql` | Columnas de costo promedio en `products` + auditoría de costo en `inventory_movements` |
| V10 | `V10__sku_sequence_and_unique.sql` | Secuencia `product_sku_seq`; índice único en SKU |
| V11 | `V11__purchase_receipts_and_payment_history.sql` | Tablas `purchase_order_receipts`, `purchase_order_receipt_lines`, `supplier_payments`; extensión de `accounts_payable` |
| V12 | `V12__extend_supplier_payments.sql` | Nuevas columnas en `supplier_payments` (origen, cuenta destino, referencia) |
| V13 | `V13__financial_accounts_and_movements.sql` | Tablas `financial_accounts`, `financial_movements`; FK en `supplier_payments`; seed de 2 cajas |
| V14 | `V14__project_tracking.sql` | Tablas `sprints`, `project_tasks`, `prompt_plans`; seed de Sprint 1 |
| V15 | `V15__user_stories.sql` | Tablas `user_stories`, `story_scenarios` |

## Resumen de tablas

| Tabla | Módulo | Descripción |
|-------|--------|-------------|
| `users` | Identity | Usuarios del sistema |
| `refresh_tokens` | Identity | Tokens de refresco JWT |
| `categories` | Catalog | Categorías de productos |
| `products` | Catalog | Productos con SKU, costos, tipo |
| `lots` | Inventory | Lotes físicos de ingreso |
| `inventory_movements` | Inventory | Movimientos de inventario (append-only) |
| `movement_lots` | Inventory | Relación movimiento ↔ lotes consumidos |
| `suppliers` | Procurement | Proveedores |
| `purchase_orders` | Procurement | Órdenes de compra |
| `purchase_order_lines` | Procurement | Líneas de OC |
| `purchase_order_receipts` | Procurement | Recepciones de OC |
| `purchase_order_receipt_lines` | Procurement | Líneas de recepción |
| `accounts_payable` | Finance | Cuentas por pagar |
| `supplier_payments` | Finance | Historial de pagos a proveedores |
| `financial_accounts` | Finance | Cajas, bancos, billeteras |
| `financial_movements` | Finance | Movimientos de cuentas financieras |
| `sprints` | Project | Sprints de desarrollo |
| `project_tasks` | Project | Tareas del equipo |
| `prompt_plans` | Project | Prompts planificados para Claude Code |
| `user_stories` | Project | Historias de usuario y RNF |
| `story_scenarios` | Project | Escenarios Gherkin |

## DDL detallado por tabla

### `users`
```sql
CREATE TABLE users (
    id            UUID         PRIMARY KEY,                          -- PK app-generated
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL,                            -- único con índice parcial
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'OPERATOR'
                               CHECK (role IN ('ADMIN','SUPERVISOR','OPERATOR')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Índice: uq_users_email_active ON (LOWER(email)) WHERE deleted_at IS NULL
```

### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 del token crudo
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,                     -- NULL = activo
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Índices: idx_refresh_tokens_user_id, idx_refresh_tokens_token_hash
```

### `categories`
```sql
CREATE TABLE categories (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,           -- único parcial (case-insensitive)
    description TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Índice: uq_categories_name_active ON (LOWER(name)) WHERE deleted_at IS NULL
```

### `products`
```sql
CREATE TABLE products (
    id                          UUID          PRIMARY KEY,
    name                        VARCHAR(100)  NOT NULL,
    category_id                 UUID          REFERENCES categories(id) ON DELETE RESTRICT,
    unit_of_measure             VARCHAR(10)   NOT NULL
                                CHECK (unit_of_measure IN ('KG','LB','UNIT','PACKAGE','LITER')),
    minimum_stock               NUMERIC(10,3) NOT NULL DEFAULT 0,
    description                 TEXT,
    active                      BOOLEAN       NOT NULL DEFAULT TRUE,
    sku                         VARCHAR(50),
    barcode                     VARCHAR(100),
    product_type                VARCHAR(30)
                                CHECK (product_type IN ('CONSUMER_GOOD','RAW_MATERIAL','INTERNAL_SUPPLY','SERVICE_ASSOCIATED')),
    purchase_cost               NUMERIC(14,4),
    purchase_cost_last          NUMERIC(14,4), -- último precio de compra recibido
    average_cost                NUMERIC(14,4), -- costo promedio ponderado
    sale_price                  NUMERIC(14,4),
    inventory_tracking_enabled  BOOLEAN       NOT NULL DEFAULT TRUE,
    default_warehouse           VARCHAR(100),
    status                      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
    image_url                   TEXT,
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Índices: uq_products_name_active (LOWER(name)) WHERE deleted_at IS NULL
--          uq_products_sku_active  (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL
--          idx_products_category_id
-- Secuencia: product_sku_seq → genera SKU "PRO-000001"
```

### `lots`
```sql
CREATE TABLE lots (
    id              UUID          PRIMARY KEY,
    product_id      UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        NUMERIC(10,3) NOT NULL CHECK (quantity > 0),   -- cantidad original
    purchase_price  NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
    received_at     DATE          NOT NULL,
    expires_at      DATE,
    invoice_number  VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Índice: idx_lots_product_received ON (product_id, received_at)
```

### `inventory_movements` (append-only)
```sql
CREATE TABLE inventory_movements (
    id                    UUID          PRIMARY KEY,
    product_id            UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type         VARCHAR(30)   NOT NULL
                          CHECK (movement_type IN ('ENTRY','EXIT','WASTE','POSITIVE_ADJUSTMENT','NEGATIVE_ADJUSTMENT')),
    quantity              NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit_cost             NUMERIC(12,2),
    previous_average_cost NUMERIC(14,4), -- costo promedio antes del movimiento
    new_average_cost      NUMERIC(14,4), -- costo promedio después del movimiento
    reason                TEXT,
    notes                 TEXT,
    created_by            VARCHAR(100),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- REGLAS de inmutabilidad a nivel BD:
-- CREATE RULE no_update_inventory_movements AS ON UPDATE TO inventory_movements DO INSTEAD NOTHING;
-- CREATE RULE no_delete_inventory_movements AS ON DELETE TO inventory_movements DO INSTEAD NOTHING;
-- Índices: idx_inventory_movements_product_id, idx_inventory_movements_created_at
```

### `movement_lots`
```sql
CREATE TABLE movement_lots (
    id           UUID          PRIMARY KEY,
    movement_id  UUID          NOT NULL REFERENCES inventory_movements(id) ON DELETE RESTRICT,
    lot_id       UUID          NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
    quantity     NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    UNIQUE (movement_id, lot_id)
);
-- Índice: idx_movement_lots_lot_id
```

### `suppliers`
```sql
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
```

### `purchase_orders`
```sql
CREATE TABLE purchase_orders (
    id               UUID          PRIMARY KEY,
    order_number     VARCHAR(20)   NOT NULL UNIQUE,   -- "PO-{seq}", secuencia po_number_seq
    supplier_id      UUID          NOT NULL REFERENCES suppliers(id),
    status           VARCHAR(20)   NOT NULL,           -- DRAFT|CONFIRMED|PARTIALLY_RECEIVED|RECEIVED|CANCELLED
    expected_delivery DATE,
    warehouse        VARCHAR(100),
    payment_terms    VARCHAR(50),
    notes            TEXT,
    discount         NUMERIC(14,4) NOT NULL DEFAULT 0,
    paid_amount      NUMERIC(14,4) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL,
    deleted_at       TIMESTAMPTZ
);
```

### `purchase_order_lines`
```sql
CREATE TABLE purchase_order_lines (
    id                UUID          PRIMARY KEY,
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id        UUID          NOT NULL REFERENCES products(id),
    quantity          NUMERIC(14,4) NOT NULL,
    unit_cost         NUMERIC(14,4) NOT NULL,
    tax_rate          NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
    discount          NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    deleted_at        TIMESTAMPTZ
);
```

### `purchase_order_receipts`
```sql
CREATE TABLE purchase_order_receipts (
    id                UUID        PRIMARY KEY,
    purchase_order_id UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
-- Índice único: uq_receipt_purchase_order ON (purchase_order_id) WHERE deleted_at IS NULL
```

### `purchase_order_receipt_lines`
```sql
CREATE TABLE purchase_order_receipt_lines (
    id                     UUID          PRIMARY KEY,
    receipt_id             UUID          NOT NULL REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
    purchase_order_line_id UUID          NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT,
    product_id             UUID          NOT NULL REFERENCES products(id),
    quantity_ordered       NUMERIC(14,4) NOT NULL,
    quantity_received      NUMERIC(14,4) NOT NULL DEFAULT 0,
    unit_cost              NUMERIC(14,4) NOT NULL,
    tax_rate               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### `accounts_payable`
```sql
CREATE TABLE accounts_payable (
    id                UUID          PRIMARY KEY,
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    supplier_id       UUID          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    total_amount      NUMERIC(14,4) NOT NULL CHECK (total_amount >= 0),
    paid_amount       NUMERIC(14,4) NOT NULL DEFAULT 0,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','CANCELLED')),
    invoice_number    VARCHAR(20),   -- "FAC-000001", secuencia invoice_number_seq
    receipt_id        UUID          REFERENCES purchase_order_receipts(id),
    due_date          DATE,
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
-- Índices: uq_ap_purchase_order (purchase_order_id) WHERE deleted_at IS NULL
--          uq_ap_invoice_number (invoice_number) WHERE invoice_number IS NOT NULL AND deleted_at IS NULL
--          idx_ap_supplier, idx_ap_status
```

### `supplier_payments`
```sql
CREATE TABLE supplier_payments (
    id                  UUID          PRIMARY KEY,
    accounts_payable_id UUID          NOT NULL REFERENCES accounts_payable(id) ON DELETE RESTRICT,
    payment_date        DATE          NOT NULL,
    amount              NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    payment_method      VARCHAR(50),
    bank_account        VARCHAR(100),
    payment_origin      VARCHAR(100),  -- nombre de la cuenta origen (ej: "Caja principal")
    supplier_account    VARCHAR(200),  -- cuenta destino del proveedor
    reference_number    VARCHAR(100),
    notes               TEXT,
    financial_account_id UUID         REFERENCES financial_accounts(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### `financial_accounts`
```sql
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
-- Seed V13: "Caja principal" (CASH) y "Caja menor" (CASH) con saldo 0
```

### `financial_movements`
```sql
CREATE TABLE financial_movements (
    id                   UUID          PRIMARY KEY,
    financial_account_id UUID          NOT NULL REFERENCES financial_accounts(id),
    movement_type        VARCHAR(20)   NOT NULL,  -- INCOME | EXPENSE
    concept              VARCHAR(255)  NOT NULL,
    amount               NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    balance_before       NUMERIC(14,4) NOT NULL,
    balance_after        NUMERIC(14,4) NOT NULL,
    related_document     VARCHAR(100),
    related_entity_id    UUID,
    movement_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### `sprints`
```sql
CREATE TABLE sprints (
    id         UUID        PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    goal       TEXT,
    start_date DATE,
    end_date   DATE,
    status     VARCHAR(20)  NOT NULL DEFAULT 'PLANNING',  -- PLANNING|ACTIVE|COMPLETED
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### `project_tasks`
```sql
CREATE TABLE project_tasks (
    id                    UUID         PRIMARY KEY,
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    task_type             VARCHAR(20)  NOT NULL DEFAULT 'DEV',  -- DEV|QA|PLANNING|INFRA|DESIGN
    status                VARCHAR(20)  NOT NULL DEFAULT 'TODO', -- TODO|IN_PROGRESS|REVIEW|DONE
    assignee              VARCHAR(20),                          -- MANUEL|ISKIAN
    priority              VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM', -- LOW|MEDIUM|HIGH|CRITICAL
    sprint_id             UUID         REFERENCES sprints(id),
    module                VARCHAR(50),
    linked_requirement_id VARCHAR(20),
    estimated_hours       INTEGER,
    actual_hours          INTEGER,
    notes                 TEXT,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ
);
```

### `prompt_plans`
```sql
CREATE TABLE prompt_plans (
    id             UUID         PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    objective      TEXT,
    context_info   TEXT,
    prompt_content TEXT         NOT NULL,
    module         VARCHAR(50),
    category       VARCHAR(30)  NOT NULL DEFAULT 'NEW_FEATURE',
                   -- NEW_FEATURE|BUG_FIX|REFACTOR|DOCUMENTATION|TESTING|DATABASE|CONFIGURATION
    status         VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
                   -- DRAFT|READY|USED|ARCHIVED
    linked_task_id UUID         REFERENCES project_tasks(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
```

### `user_stories`
```sql
CREATE TABLE user_stories (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    req_id            VARCHAR(20) NOT NULL UNIQUE,  -- ej: "RF-001", "RNF-001"
    epic              VARCHAR(100),
    story_type        VARCHAR(20) NOT NULL DEFAULT 'FUNCTIONAL',  -- FUNCTIONAL|NON_FUNCTIONAL
    persona           VARCHAR(150),
    action_statement  TEXT,
    outcome_statement TEXT,
    description       TEXT,
    module            VARCHAR(50),
    priority          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status            VARCHAR(20) NOT NULL DEFAULT 'DEFINED',
                      -- DEFINED|IN_DEV|REVIEW|DONE|BLOCKED
    nfr_category      VARCHAR(50),
    nfr_criterion     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
```

### `story_scenarios`
```sql
CREATE TABLE story_scenarios (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_story_id    UUID         NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
    scenario_title   VARCHAR(255) NOT NULL,
    given_conditions TEXT         NOT NULL,
    when_event       TEXT         NOT NULL,
    then_outcome     TEXT         NOT NULL,
    scenario_type    VARCHAR(20)  NOT NULL DEFAULT 'HAPPY_PATH',  -- HAPPY_PATH|NEGATIVE|EDGE
    sort_order       INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);
```

## Secuencias PostgreSQL

| Secuencia | Inicio | Uso |
|-----------|--------|-----|
| `po_number_seq` | 1001 | Números de OC: `PO-1001`, `PO-1002`... |
| `product_sku_seq` | 1 | SKUs de producto: `PRO-000001`... |
| `invoice_number_seq` | 1 | Números de factura: `FAC-000001`... |

## Observaciones del Arquitecto

1. **`inventory_movements` es la única tabla verdaderamente inmutable**: se protege con reglas PostgreSQL (`DO INSTEAD NOTHING` en UPDATE y DELETE). El resto de tablas usan soft delete pero son técnicamente mutables.

2. **La tabla `lots` no tiene `updated_at` ni `deleted_at`**: es de solo inserción por diseño (un lote no cambia), pero no tiene las protecciones a nivel BD que tiene `inventory_movements`.

3. **`accounts_payable.status` en la BD no incluye `OVERDUE`** (los valores del CHECK son `PENDING|PARTIALLY_PAID|PAID|CANCELLED`), pero el frontend sí muestra y filtra por `OVERDUE`. No existe lógica en el backend que actualice el status a `OVERDUE`.

4. **`purchase_orders` y `purchase_order_lines` no tienen `DEFAULT NOW()`** en `created_at`/`updated_at` — la V6 los crea sin default, por lo que el ORM (JPA Auditing) debe proveer el valor.
