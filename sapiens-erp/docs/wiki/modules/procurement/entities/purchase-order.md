---
tags: [procurement, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: OrdenCompra

**Módulo**: [[modules/procurement/module]]
**Tipo**: Aggregate Root

## Atributos — Cabecera

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `numero` | `VARCHAR(20)` | `String` | Número correlativo único |
| `proveedor_id` | `UUID` | `UUID` | FK → proveedores |
| `estado` | `VARCHAR(20)` | `EstadoOrden` | Ver ciclo de vida |
| `fecha_emision` | `DATE` | `LocalDate` | Fecha de creación |
| `fecha_esperada` | `DATE` | `LocalDate` | Fecha esperada de entrega |
| `total` | `NUMERIC(12,2)` | `BigDecimal` | Calculado de los ítems |
| `notas` | `TEXT` | `String` | Observaciones |
| `usuario_id` | `UUID` | `UUID` | Usuario que creó la orden |
| `created_at` | `TIMESTAMP` | `Instant` | Auditoría |

## Atributos — Ítem de Orden

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `orden_compra_id` | `UUID` | `UUID` | FK → ordenes_compra |
| `producto_id` | `UUID` | `UUID` | FK → productos |
| `cantidad_pedida` | `NUMERIC(10,3)` | `BigDecimal` | Cantidad solicitada |
| `cantidad_recibida` | `NUMERIC(10,3)` | `BigDecimal` | Acumulado recibido |
| `precio_unitario` | `NUMERIC(12,2)` | `BigDecimal` | Precio acordado |

## Tablas en BD

```sql
CREATE TABLE ordenes_compra (
    id              UUID        PRIMARY KEY,
    numero          VARCHAR(20) UNIQUE NOT NULL,
    proveedor_id    UUID        NOT NULL REFERENCES proveedores(id),
    estado          VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    fecha_emision   DATE        NOT NULL,
    fecha_esperada  DATE,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    notas           TEXT,
    usuario_id      UUID        NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE items_orden_compra (
    id                UUID          PRIMARY KEY,
    orden_compra_id   UUID          NOT NULL REFERENCES ordenes_compra(id),
    producto_id       UUID          NOT NULL REFERENCES productos(id),
    cantidad_pedida   NUMERIC(10,3) NOT NULL CHECK (cantidad_pedida > 0),
    cantidad_recibida NUMERIC(10,3) NOT NULL DEFAULT 0,
    precio_unitario   NUMERIC(12,2) NOT NULL
);
```

## Ver también

- [[modules/procurement/entities/supplier]]
- [[modules/inventory/entities/lot]]
- [[architecture/integration-flows]]
