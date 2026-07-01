---
tags: [inventory, entidad, merma]
fecha: 2026-06-21
---

# Entidad: Merma

**Módulo**: [[modules/inventory/module]]
**Tipo**: Aggregate Root

## Qué es

Registro de una pérdida de producto por deterioro, vencimiento, rotura u otras causas. Al confirmar una merma, el sistema crea automáticamente un Movimiento de tipo `MERMA`.

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `producto_id` | `UUID` | `UUID` | FK → productos |
| `lote_id` | `UUID` | `UUID` | FK → lotes (nullable) |
| `cantidad` | `NUMERIC(10,3)` | `BigDecimal` | Cantidad perdida |
| `tipo_merma` | `VARCHAR(30)` | `TipoMerma` | Clasificación de la pérdida |
| `motivo` | `VARCHAR(255)` | `String` | Descripción obligatoria |
| `movimiento_id` | `UUID` | `UUID` | FK → movimientos_inventario (generado) |
| `usuario_id` | `UUID` | `UUID` | Usuario que registró |
| `fecha` | `TIMESTAMP` | `Instant` | Fecha de registro |

## Enum: TipoMerma

```java
public enum TipoMerma {
    VENCIMIENTO,    // el producto expiró
    DETERIORO,      // se estropeó antes de vencer
    ROTURA,         // daño físico durante manejo
    CONTEO,         // ajuste por conteo físico
    OTRO            // otros motivos (requiere motivo descriptivo)
}
```

## Flujo de registro

```
1. Usuario registra Merma (producto, cantidad, tipo, motivo)
2. Sistema valida stock suficiente (INV-003)
3. Sistema crea MovimientoInventario de tipo MERMA
4. Merma queda vinculada al Movimiento
5. Sistema verifica alertas de stock mínimo (INV-006)
```

## Tabla en BD

```sql
CREATE TABLE mermas (
    id           UUID         PRIMARY KEY,
    producto_id  UUID         NOT NULL REFERENCES productos(id),
    lote_id      UUID         REFERENCES lotes(id),
    cantidad     NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    tipo_merma   VARCHAR(30)  NOT NULL,
    motivo       VARCHAR(255) NOT NULL,
    movimiento_id UUID        NOT NULL REFERENCES movimientos_inventario(id),
    usuario_id   UUID         NOT NULL,
    fecha        TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## Ver también

- [[modules/inventory/entities/movement]]
- [[modules/inventory/business-rules]]
