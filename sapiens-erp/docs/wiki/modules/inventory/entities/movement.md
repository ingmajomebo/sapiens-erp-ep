---
tags: [inventory, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Movimiento de Inventario (Clase: `InventoryMovement`)

**Módulo**: [[modules/inventory/module]]
**Tipo**: Aggregate Root / Registro de auditoría (inmutable)

> **Convención**: nombres en código (tabla, columnas, clase Java) en inglés.

## Atributos

| Campo DB | Columna SQL | Campo Java | Tipo Java | Descripción |
|----------|-------------|------------|-----------|-------------|
| id | `id` | `id` | `UUID` | Clave primaria |
| producto | `product_id` | `productId` | `UUID` | FK → products |
| tipo | `type` | `type` | `MovementType` | Tipo de movimiento |
| cantidad | `quantity` | `quantity` | `BigDecimal` | Siempre positivo |
| precio unitario | `unit_price` | `unitPrice` | `BigDecimal` | Precio al momento |
| motivo | `reason` | `reason` | `String` | Requerido para WASTE y ADJUSTMENT |
| referencia ID | `reference_id` | `referenceId` | `UUID` | ID del origen (sale_id, purchase_id, etc.) |
| referencia tipo | `reference_type` | `referenceType` | `String` | `SALE`, `PURCHASE`, `WASTE`, `ADJUSTMENT` |
| usuario | `user_id` | `userId` | `UUID` | FK → users |
| fecha | `occurred_at` | `occurredAt` | `Instant` | Fecha y hora del movimiento |

## Enum: `MovementType`

```java
public enum MovementType {
    ENTRY,               // + stock (compra recibida)
    EXIT,                // − stock (venta)
    WASTE,               // − stock (pérdida)
    POSITIVE_ADJUSTMENT, // + stock (conteo físico)
    NEGATIVE_ADJUSTMENT  // − stock (conteo físico)
}
```

## Regla: inmutabilidad

Un movimiento creado **nunca se modifica ni elimina**. Solo se hacen `INSERT` en esta tabla.

## Relación con lotes

Un movimiento puede afectar uno o más lotes (por FIFO). Registrado en la tabla puente `movement_lots`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `movement_id` | UUID | FK → inventory_movements |
| `lot_id` | UUID | FK → lots |
| `quantity` | NUMERIC(10,3) | Cantidad consumida de ese lote |

## Tabla en BD

```sql
CREATE TABLE inventory_movements (
    id             UUID          PRIMARY KEY,
    product_id     UUID          NOT NULL REFERENCES products(id),
    type           VARCHAR(25)   NOT NULL,
    quantity       NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit_price     NUMERIC(12,2),
    reason         VARCHAR(255),
    reference_id   UUID,
    reference_type VARCHAR(30),
    user_id        UUID          NOT NULL,
    occurred_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_movement_type CHECK (
        type IN ('ENTRY','EXIT','WASTE','POSITIVE_ADJUSTMENT','NEGATIVE_ADJUSTMENT')
    )
);

-- Sin UPDATE ni DELETE en esta tabla (política a nivel de aplicación)

CREATE TABLE movement_lots (
    movement_id UUID          NOT NULL REFERENCES inventory_movements(id),
    lot_id      UUID          NOT NULL REFERENCES lots(id),
    quantity    NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (movement_id, lot_id)
);
```

## Ver también

- [[modules/inventory/business-rules]]
- [[modules/inventory/entities/stock]]
- [[modules/inventory/entities/lot]]
