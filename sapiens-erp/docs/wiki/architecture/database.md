---
tags: [arquitectura, base-datos, postgresql]
fecha: 2026-06-21
---

# Base de Datos — Diseño y Convenciones

## Motor

**PostgreSQL 16** con migraciones gestionadas por **Flyway**.

## Convenciones de nombrado

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Tablas | `snake_case`, plural | `movimientos_inventario` |
| Columnas | `snake_case` | `fecha_vencimiento` |
| Claves primarias | `id` | `id UUID PRIMARY KEY` |
| Claves foráneas | `<tabla_singular>_id` | `producto_id` |
| Índices | `idx_<tabla>_<columna>` | `idx_lotes_producto_fecha` |
| Restricciones unique | `uq_<tabla>_<descripcion>` | `uq_productos_nombre_activo` |
| Restricciones check | `chk_<tabla>_<descripcion>` | `chk_movimientos_cantidad` |
| Vistas | `v_<descripcion>` | `v_stock_actual` |

## Convención de idioma

**Todos los nombres en código están en inglés**: tablas, columnas, clases Java, enums, DTOs.  
La documentación y el lenguaje ubicuo del negocio permanecen en español.

## Tablas por módulo

### Catalog
- `products`
- `categories`

### Inventory
- `inventory_movements` — inmutable, solo INSERT
- `movement_lots` — tabla puente movimiento ↔ lote
- `lots`
- `wastes`
- `alerts`

### Procurement
- `suppliers`
- `purchase_orders`
- `purchase_order_items`

### Sales
- `customers`
- `sales`
- `sale_items`
- `pos_sessions`

### Finance
- `cash_registers`
- `cash_movements`
- `expenses`
- `invoices`

### Identity
- `users`
- `refresh_tokens`

## Tipos de datos estándar

| Dato | Tipo PostgreSQL | Notas |
|------|----------------|-------|
| ID | `UUID` | Generado en la app |
| Cantidades de inventario | `NUMERIC(10,3)` | 3 decimales para KG |
| Montos monetarios | `NUMERIC(12,2)` | 2 decimales |
| Estados/enums | `VARCHAR(20-30)` | No usar tipos ENUM de PG |
| Textos cortos | `VARCHAR(N)` | Con límite explícito |
| Textos largos | `TEXT` | Solo cuando no hay límite previsible |
| Fechas | `DATE` | Sin hora |
| Timestamps | `TIMESTAMP` | Sin zona (UTC en aplicación) |
| Booleanos | `BOOLEAN` | `NOT NULL DEFAULT TRUE/FALSE` |

## Reglas de esquema

### Claves primarias

```sql
id UUID PRIMARY KEY  -- generado en la app con UUID.randomUUID()
```

Nunca usar `SERIAL`, `BIGSERIAL` ni `AUTO_INCREMENT`.

### Columnas de auditoría (toda tabla de entidad)

```sql
created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at  TIMESTAMP           -- NULL = activo
```

### Soft delete

```sql
-- Consulta estándar para registros activos
WHERE deleted_at IS NULL

-- Índice único parcial para unicidad entre activos
CREATE UNIQUE INDEX uq_productos_nombre_activo
    ON productos (LOWER(nombre))
    WHERE deleted_at IS NULL;
```

### Integridad referencial

```sql
-- Siempre declarar FK en BD, no solo en la app
REFERENCES tabla(id)
-- Con ON DELETE RESTRICT por defecto (no CASCADE, salvo justificación)
```

## Estrategia de migraciones (Flyway)

```
backend/src/main/resources/db/migration/
├── V1__initial_schema.sql
├── V2__create_lotes.sql
├── V3__add_alertas.sql
└── ...
```

Reglas:
- Numeración secuencial: `V{n}__{descripcion}.sql`
- Una migración ejecutada **nunca se modifica**
- Añadir columna → nueva migración `ALTER TABLE ... ADD COLUMN ...`
- Cambiar tipo de columna → migración con `ALTER TABLE ... ALTER COLUMN ...` o nueva columna + backfill + DROP
- Los índices van en la misma migración que la tabla

## Índices recomendados

```sql
-- Movimientos: consulta de stock por producto (crítica)
CREATE INDEX idx_movimientos_producto_id ON movimientos_inventario (producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario (fecha DESC);

-- Lotes: consumo FIFO
CREATE INDEX idx_lotes_producto_fecha ON lotes (producto_id, fecha_ingreso);

-- Ventas: listado por fecha
CREATE INDEX idx_ventas_fecha ON ventas (fecha DESC);

-- Alertas: activas
CREATE INDEX idx_alertas_estado ON alertas (estado) WHERE estado = 'ACTIVA';
```

## Ver también

- [[architecture/overview]]
- [[overview/cross-cutting]]
- [[decisions/adr-005-soft-delete]]
