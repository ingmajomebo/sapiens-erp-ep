# Procurement — Entidades

## Supplier

Tabla: `suppliers`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `name` | `String` | `name VARCHAR(200)` | NOT NULL |
| `taxId` | `String` | `tax_id VARCHAR(20)` | nullable — RUT o CUIT |
| `contactName` | `String` | `contact_name VARCHAR(100)` | nullable |
| `phone` | `String` | `phone VARCHAR(20)` | nullable |
| `email` | `String` | `email VARCHAR(100)` | nullable |
| `address` | `String` | `address TEXT` | nullable |
| `notes` | `String` | `notes TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

---

## PurchaseOrder

Tabla: `purchase_orders`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `orderNumber` | `String` | `order_number VARCHAR(20)` | NOT NULL, UNIQUE |
| `supplier` | `Supplier` (lazy) | `supplier_id UUID FK` | NOT NULL |
| `status` | `PurchaseOrderStatus` | `status VARCHAR(30)` | NOT NULL, DEFAULT 'DRAFT' |
| `notes` | `String` | `notes TEXT` | nullable |
| `expectedDelivery` | `LocalDate` | `expected_delivery DATE` | nullable |
| `confirmedAt` | `Instant` | `confirmed_at TIMESTAMPTZ` | nullable |
| `receivedAt` | `Instant` | `received_at TIMESTAMPTZ` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos computados:**
- `subtotal()` → suma de `(unitPrice * quantity)` por línea
- `totalTax()` → suma de impuestos por línea
- `total()` → subtotal + totalTax
- `pendingBalance()` → total − suma de montos pagados en AP asociadas

---

## PurchaseOrderLine

Tabla: `purchase_order_lines`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `purchaseOrder` | `PurchaseOrder` | `purchase_order_id UUID FK` | NOT NULL |
| `product` | `Product` (lazy) | `product_id UUID FK` | NOT NULL |
| `quantity` | `BigDecimal` | `quantity NUMERIC(10,3)` | NOT NULL, CHECK > 0 |
| `unitPrice` | `BigDecimal` | `unit_price NUMERIC(14,4)` | NOT NULL |
| `discount` | `BigDecimal` | `discount NUMERIC(5,2)` | NOT NULL, DEFAULT 0 |
| `taxRate` | `BigDecimal` | `tax_rate NUMERIC(5,2)` | NOT NULL, DEFAULT 0 |
| `receivedQuantity` | `BigDecimal` | `received_quantity NUMERIC(10,3)` | NOT NULL, DEFAULT 0 |

---

## PurchaseReceipt

Tabla: `purchase_order_receipts`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `purchaseOrder` | `PurchaseOrder` | `purchase_order_id UUID FK` | NOT NULL |
| `receiptNumber` | `String` | `receipt_number VARCHAR(20)` | NOT NULL, UNIQUE |
| `receivedAt` | `Instant` | `received_at TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() |
| `notes` | `String` | `notes TEXT` | nullable |

---

## PurchaseReceiptLine

Tabla: `purchase_order_receipt_lines`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `receipt` | `PurchaseReceipt` | `receipt_id UUID FK` | NOT NULL |
| `purchaseOrderLine` | `PurchaseOrderLine` | `purchase_order_line_id UUID FK` | NOT NULL |
| `receivedQuantity` | `BigDecimal` | `received_quantity NUMERIC(10,3)` | NOT NULL |

---

## Enums

### PurchaseOrderStatus

```java
public enum PurchaseOrderStatus {
    DRAFT,
    CONFIRMED,
    PARTIALLY_RECEIVED,
    RECEIVED,
    CANCELLED
}
```

---

## Observaciones del Arquitecto

### OBS-PROC-ENT-01: `PurchaseOrderStatus` ausente en frontend
El frontend (`shared/types.ts`) define `PurchaseOrderStatus` sin incluir `PARTIALLY_RECEIVED`. Las órdenes en ese estado pueden mostrarse incorrectamente o no filtrarse bien en la UI.
