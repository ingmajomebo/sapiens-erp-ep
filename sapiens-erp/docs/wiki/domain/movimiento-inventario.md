---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# MovimientoInventario

## Qué es

Registro inmutable de cualquier cambio en el stock de un [[producto]]. Es el libro contable del inventario.

## Tipos de movimiento

| Tipo | Efecto en stock | Descripción |
|------|----------------|-------------|
| `ENTRADA` | + | Ingreso de un nuevo [[lote]] |
| `SALIDA` | − | [[venta|Venta]] o despacho |
| `AJUSTE_POSITIVO` | + | Corrección por conteo físico |
| `AJUSTE_NEGATIVO` | − | Corrección por conteo físico |
| `MERMA` | − | Pérdida por deterioro, rotura, etc. |

## Atributos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `productoId` | UUID | FK → [[producto]] |
| `loteId` | UUID | FK → [[lote]] (nullable para ajustes manuales) |
| `tipo` | Enum | Tipo de movimiento (ver tabla arriba) |
| `cantidad` | BigDecimal | Cantidad movida (siempre positivo) |
| `precioUnitario` | BigDecimal | Precio al momento del movimiento |
| `motivo` | String | Descripción libre del motivo |
| `usuarioId` | UUID | Usuario que registró el movimiento |
| `fecha` | Timestamp | Fecha y hora del movimiento |

## Reglas de negocio

- Los registros son **inmutables** — nunca se modifican ni eliminan. Un error se corrige con un movimiento opuesto.
- El stock no puede quedar negativo después de aplicar un movimiento de salida/merma/ajuste negativo.
- Todo movimiento debe tener un `usuarioId` válido para auditoría.

## Relaciones

- Afecta a un [[producto]]
- Puede estar asociado a un [[lote]]
- Puede originarse desde una [[venta]]

## Tabla en BD

```sql
CREATE TABLE movimientos_inventario (
    id              UUID PRIMARY KEY,
    producto_id     UUID NOT NULL REFERENCES productos(id),
    lote_id         UUID REFERENCES lotes(id),
    tipo            VARCHAR(20) NOT NULL,
    cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2),
    motivo          VARCHAR(255),
    usuario_id      UUID NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);
```
