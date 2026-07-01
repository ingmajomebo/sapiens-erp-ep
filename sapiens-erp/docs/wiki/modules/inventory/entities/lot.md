---
tags: [inventory, entidad]
fecha: 2026-06-21
---

# Entidad: Lote (Clase: `Lot`)

**Módulo**: [[modules/inventory/module]]
**Tipo**: Aggregate Root

> **Convención**: nombres en código (tabla, columnas, clase Java) en inglés.

## Atributos

| Campo DB | Columna SQL | Campo Java | Tipo Java | Descripción |
|----------|-------------|------------|-----------|-------------|
| id | `id` | `id` | `UUID` | Clave primaria |
| producto | `product_id` | `productId` | `UUID` | FK → products |
| proveedor | `supplier_id` | `supplierId` | `UUID` | FK → suppliers |
| orden de compra | `purchase_order_id` | `purchaseOrderId` | `UUID` | FK → purchase_orders |
| cantidad | `quantity` | `quantity` | `BigDecimal` | Cantidad recibida original |
| precio de compra | `purchase_price` | `purchasePrice` | `BigDecimal` | Precio unitario de compra |
| fecha de ingreso | `received_at` | `receivedAt` | `LocalDate` | Fecha de entrada al inventario |
| fecha de vencimiento | `expires_at` | `expiresAt` | `LocalDate` | Nullable — si el producto no vence |
| número de factura | `invoice_number` | `invoiceNumber` | `String` | Referencia del documento de compra |
| creado en | `created_at` | `createdAt` | `Instant` | Auditoría |

## Stock del lote (calculado)

El lote no almacena `available_quantity`. Se calcula como:

```sql
lot.quantity - COALESCE(SUM(ml.quantity), 0)
FROM movement_lots ml WHERE ml.lot_id = lot.id
```

## Reglas

- Un lote pertenece a exactamente una orden de compra (INV-010)
- El lote se consume en orden FIFO por `received_at` (INV-004)
- Si `expires_at` se acerca, se genera alerta (INV-007)

## Tabla en BD

```sql
CREATE TABLE lots (
    id                UUID          PRIMARY KEY,
    product_id        UUID          NOT NULL REFERENCES products(id),
    supplier_id       UUID          NOT NULL REFERENCES suppliers(id),
    purchase_order_id UUID          REFERENCES purchase_orders(id),
    quantity          NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    purchase_price    NUMERIC(12,2) NOT NULL,
    received_at       DATE          NOT NULL,
    expires_at        DATE,
    invoice_number    VARCHAR(50),
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lots_product_received ON lots (product_id, received_at);
```

## Ver también

- [[modules/inventory/entities/movement]]
- [[modules/inventory/business-rules]]
- [[modules/procurement/entities/purchase-order]]
