---
tags: [finance, entidad, gasto]
fecha: 2026-06-21
---

# Entidad: Gasto

**Módulo**: [[modules/finance/module]]
**Tipo**: Aggregate Root

## Qué es

Egreso de dinero del negocio no relacionado con la compra de mercancía (ej. pago de servicios, mantenimiento, limpieza, transporte).

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `categoria` | `VARCHAR(50)` | `String` | Categoría del gasto |
| `descripcion` | `VARCHAR(255)` | `String` | Detalle del gasto |
| `monto` | `NUMERIC(12,2)` | `BigDecimal` | Monto positivo |
| `tipo_pago` | `VARCHAR(20)` | `TipoPago` | `EFECTIVO`, `TRANSFERENCIA`, etc. |
| `comprobante` | `VARCHAR(100)` | `String` | Número de comprobante (nullable) |
| `fecha` | `DATE` | `LocalDate` | Fecha del gasto |
| `usuario_id` | `UUID` | `UUID` | Usuario que registró |
| `created_at` | `TIMESTAMP` | `Instant` | Auditoría |

## Tabla en BD

```sql
CREATE TABLE gastos (
    id          UUID          PRIMARY KEY,
    categoria   VARCHAR(50)   NOT NULL,
    descripcion VARCHAR(255)  NOT NULL,
    monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    tipo_pago   VARCHAR(20)   NOT NULL,
    comprobante VARCHAR(100),
    fecha       DATE          NOT NULL,
    usuario_id  UUID          NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

## Ver también

- [[modules/finance/module]]
