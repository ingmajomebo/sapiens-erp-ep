---
tags: [finance, entidad, caja]
fecha: 2026-06-21
---

# Entidad: CajaRegistradora

**Módulo**: [[modules/finance/module]]
**Tipo**: Aggregate Root

## Qué es

Representa una caja física del negocio. Una caja puede tener múltiples [[modules/sales/entities/pos-session|SesionesPOS]] a lo largo del tiempo, pero solo una activa a la vez.

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `nombre` | `VARCHAR(50)` | `String` | Nombre identificador (ej. "Caja Principal") |
| `activo` | `BOOLEAN` | `boolean` | Si está habilitada |
| `deleted_at` | `TIMESTAMP` | `Instant` | Soft delete |

## Movimientos de caja

Los movimientos de efectivo se registran en `movimientos_caja`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `caja_id` | UUID | FK → cajas_registradoras |
| `sesion_pos_id` | UUID | FK → sesiones_pos |
| `tipo` | VARCHAR | `APERTURA`, `CIERRE`, `INGRESO`, `EGRESO`, `VENTA` |
| `monto` | NUMERIC | Positivo para entradas, negativo para salidas |
| `concepto` | VARCHAR | Descripción del movimiento |
| `fecha` | TIMESTAMP | Timestamp |

## Tabla en BD

```sql
CREATE TABLE cajas_registradoras (
    id         UUID        PRIMARY KEY,
    nombre     VARCHAR(50) NOT NULL,
    activo     BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE movimientos_caja (
    id             UUID          PRIMARY KEY,
    caja_id        UUID          NOT NULL REFERENCES cajas_registradoras(id),
    sesion_pos_id  UUID          REFERENCES sesiones_pos(id),
    tipo           VARCHAR(15)   NOT NULL,
    monto          NUMERIC(12,2) NOT NULL,
    concepto       VARCHAR(255),
    fecha          TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

## Ver también

- [[modules/sales/entities/pos-session]]
- [[modules/finance/module]]
