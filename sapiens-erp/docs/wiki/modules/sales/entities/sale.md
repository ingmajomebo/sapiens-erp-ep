---
tags: [sales, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Venta

**Módulo**: [[modules/sales/module]]
**Tipo**: Aggregate Root

## Atributos — Cabecera

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `numero` | `VARCHAR(20)` | `String` | Número correlativo único |
| `cliente_id` | `UUID` | `UUID` | FK → clientes (nullable, venta sin cliente) |
| `sesion_pos_id` | `UUID` | `UUID` | FK → sesiones_pos (nullable) |
| `estado` | `VARCHAR(15)` | `EstadoVenta` | `PENDIENTE`, `CONFIRMADA`, `ANULADA` |
| `tipo_pago` | `VARCHAR(20)` | `TipoPago` | `EFECTIVO`, `TARJETA`, `TRANSFERENCIA` |
| `subtotal` | `NUMERIC(12,2)` | `BigDecimal` | Antes de impuestos |
| `impuesto` | `NUMERIC(12,2)` | `BigDecimal` | Monto de impuesto |
| `total` | `NUMERIC(12,2)` | `BigDecimal` | Total final |
| `fecha` | `TIMESTAMP` | `Instant` | Fecha y hora |
| `usuario_id` | `UUID` | `UUID` | Vendedor |

## Atributos — Ítem Venta

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `venta_id` | `UUID` | `UUID` | FK → ventas |
| `producto_id` | `UUID` | `UUID` | FK → productos |
| `cantidad` | `NUMERIC(10,3)` | `BigDecimal` | Cantidad vendida |
| `precio_unitario` | `NUMERIC(12,2)` | `BigDecimal` | Precio al momento de la venta |
| `subtotal` | `NUMERIC(12,2)` | `BigDecimal` | `cantidad * precio_unitario` |

## Tablas en BD

```sql
CREATE TABLE ventas (
    id           UUID         PRIMARY KEY,
    numero       VARCHAR(20)  UNIQUE NOT NULL,
    cliente_id   UUID         REFERENCES clientes(id),
    sesion_pos_id UUID        REFERENCES sesiones_pos(id),
    estado       VARCHAR(15)  NOT NULL DEFAULT 'PENDIENTE',
    tipo_pago    VARCHAR(20)  NOT NULL,
    subtotal     NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total        NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha        TIMESTAMP    NOT NULL DEFAULT NOW(),
    usuario_id   UUID         NOT NULL
);

CREATE TABLE items_venta (
    id              UUID          PRIMARY KEY,
    venta_id        UUID          NOT NULL REFERENCES ventas(id),
    producto_id     UUID          NOT NULL REFERENCES productos(id),
    cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal        NUMERIC(12,2) NOT NULL
);
```

## Ver también

- [[modules/sales/entities/customer]]
- [[modules/sales/entities/pos-session]]
- [[modules/inventory/entities/movement]]
