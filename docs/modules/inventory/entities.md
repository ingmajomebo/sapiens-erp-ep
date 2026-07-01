# Inventory — Entidades

## InventoryMovement

Tabla: `inventory_movements`

Registro inmutable de cada cambio en el stock. **No extiende `AuditableEntity`** — tiene su propia columna `created_at` inmutable. No tiene `updated_at` ni `deleted_at`.

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `product` | `Product` (lazy) | `product_id UUID FK → products(id)` | NOT NULL |
| `movementType` | `MovementType` (enum) | `movement_type VARCHAR(30)` | NOT NULL, CHECK (...) |
| `quantity` | `BigDecimal` | `quantity NUMERIC(10,3)` | NOT NULL, CHECK > 0 |
| `unitCost` | `BigDecimal` | `unit_cost NUMERIC(14,4)` | nullable |
| `totalCost` | `BigDecimal` | `total_cost NUMERIC(14,4)` | nullable |
| `reason` | `String` | `reason TEXT` | nullable (obligatorio para WASTE y ajustes negativos) |
| `previousAverageCost` | `BigDecimal` | `previous_average_cost NUMERIC(14,4)` | nullable — costo promedio antes de la entrada |
| `newAverageCost` | `BigDecimal` | `new_average_cost NUMERIC(14,4)` | nullable — costo promedio después de la entrada |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |

**Diseño**: Solo tiene `@Getter` (via Lombok). No hay setters. Se construye mediante constructor o factory y se persiste directamente.

---

## Lot

Tabla: `lots`

Representa un lote físico de un producto ingresado en una fecha determinada. Usado para tracking FIFO.

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `product` | `Product` (lazy) | `product_id UUID FK → products(id)` | NOT NULL |
| `initialQuantity` | `BigDecimal` | `initial_quantity NUMERIC(10,3)` | NOT NULL, CHECK > 0 |
| `currentQuantity` | `BigDecimal` | `current_quantity NUMERIC(10,3)` | NOT NULL, DEFAULT = initial_quantity |
| `unitCost` | `BigDecimal` | `unit_cost NUMERIC(14,4)` | nullable |
| `receivedAt` | `Instant` | `received_at TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() — clave para FIFO |
| `expirationDate` | `LocalDate` | `expiration_date DATE` | nullable |
| `supplierBatchCode` | `String` | `supplier_batch_code VARCHAR(100)` | nullable |

**Nota arquitectónica**: `Lot` no tiene `updatedAt` ni `deletedAt`. El campo `currentQuantity` se actualiza con cada consumo. No hay protección DB-level contra UPDATE (solo `inventory_movements` tiene RULE).

---

## MovementLot

Tabla: `movement_lots` — tabla de unión entre un movimiento y los lotes consumidos/generados.

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `movement` | `InventoryMovement` | `movement_id UUID FK` | NOT NULL |
| `lot` | `Lot` | `lot_id UUID FK` | NOT NULL |
| `quantity` | `BigDecimal` | `quantity NUMERIC(10,3)` | NOT NULL |

---

## Enums

### MovementType

```java
public enum MovementType {
    ENTRY,                 // Entrada de stock (de OC o manual)
    EXIT,                  // Salida de stock
    WASTE,                 // Merma (requiere reason)
    POSITIVE_ADJUSTMENT,   // Ajuste positivo (recuento físico)
    NEGATIVE_ADJUSTMENT    // Ajuste negativo (requiere reason)
}
```
