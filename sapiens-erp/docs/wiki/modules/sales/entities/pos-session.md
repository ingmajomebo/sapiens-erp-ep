---
tags: [sales, entidad, pos]
fecha: 2026-06-21
---

# Entidad: SesiónPOS

**Módulo**: [[modules/sales/module]]
**Tipo**: Aggregate Root

## Qué es

Representa un turno de trabajo en el Punto de Venta. Agrupa todas las ventas realizadas entre la apertura y el cierre de caja. Solo puede haber una sesión `ABIERTA` por terminal a la vez.

## Ciclo de vida

```
ABIERTA → CERRADA
```

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `usuario_id` | `UUID` | `UUID` | Operador que abrió la sesión |
| `caja_id` | `UUID` | `UUID` | FK → cajas_registradoras |
| `estado` | `VARCHAR(10)` | `EstadoSesion` | `ABIERTA`, `CERRADA` |
| `monto_apertura` | `NUMERIC(12,2)` | `BigDecimal` | Efectivo inicial declarado |
| `monto_cierre` | `NUMERIC(12,2)` | `BigDecimal` | Efectivo final contado (nullable) |
| `diferencia` | `NUMERIC(12,2)` | `BigDecimal` | `monto_cierre - monto_esperado` |
| `fecha_apertura` | `TIMESTAMP` | `Instant` | Inicio de sesión |
| `fecha_cierre` | `TIMESTAMP` | `Instant` | Fin de sesión (nullable) |

## Reglas

- No se puede registrar una venta POS sin una sesión `ABIERTA`
- Al cerrar la sesión se realiza el arqueo de caja
- La `diferencia` puede ser positiva (sobrante) o negativa (faltante) — ambas quedan registradas

## Tabla en BD

```sql
CREATE TABLE sesiones_pos (
    id              UUID          PRIMARY KEY,
    usuario_id      UUID          NOT NULL,
    caja_id         UUID          NOT NULL REFERENCES cajas_registradoras(id),
    estado          VARCHAR(10)   NOT NULL DEFAULT 'ABIERTA',
    monto_apertura  NUMERIC(12,2) NOT NULL,
    monto_cierre    NUMERIC(12,2),
    diferencia      NUMERIC(12,2),
    fecha_apertura  TIMESTAMP     NOT NULL DEFAULT NOW(),
    fecha_cierre    TIMESTAMP
);
```

## Ver también

- [[modules/sales/entities/sale]]
- [[modules/finance/entities/cash-register]]
- [[modules/finance/module]]
