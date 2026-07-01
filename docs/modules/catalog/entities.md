# Catalog — Entidades

## Product

Tabla: `products`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `name` | `String` | `name VARCHAR(100)` | NOT NULL, unique parcial por nombre (case-insensitive) |
| `category` | `Category` (lazy) | `category_id UUID FK` | nullable, ON DELETE RESTRICT |
| `unitOfMeasure` | `UnitOfMeasure` (enum) | `unit_of_measure VARCHAR(10)` | NOT NULL, CHECK IN (KG, LB, UNIT, PACKAGE, LITER) |
| `minimumStock` | `BigDecimal` | `minimum_stock NUMERIC(10,3)` | NOT NULL, DEFAULT 0 |
| `description` | `String` | `description TEXT` | nullable |
| `active` | `boolean` | `active BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `sku` | `String` | `sku VARCHAR(50)` | nullable, unique parcial entre activos |
| `barcode` | `String` | `barcode VARCHAR(100)` | nullable |
| `productType` | `ProductType` (enum) | `product_type VARCHAR(30)` | nullable |
| `purchaseCost` | `BigDecimal` | `purchase_cost NUMERIC(14,4)` | nullable |
| `purchaseCostLast` | `BigDecimal` | `purchase_cost_last NUMERIC(14,4)` | nullable — actualizado por InventoryService |
| `averageCost` | `BigDecimal` | `average_cost NUMERIC(14,4)` | nullable — recalculado en entradas |
| `salePrice` | `BigDecimal` | `sale_price NUMERIC(14,4)` | nullable |
| `inventoryTrackingEnabled` | `boolean` | `inventory_tracking_enabled BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `defaultWarehouse` | `String` | `default_warehouse VARCHAR(100)` | nullable |
| `status` | `ProductStatus` (enum) | `status VARCHAR(20)` | NOT NULL, DEFAULT 'ACTIVE' |
| `imageUrl` | `String` | `image_url TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio**:
- `Product.create(name, category, unitOfMeasure, minimumStock, description)` → factory
- `product.applyEntryAndRecalculateCost(currentStock, entryQty, entryCost)` → recalcula `averageCost`, actualiza `purchaseCostLast`, retorna costo promedio anterior (para auditoría)
- `product.deactivate()` → `active = false`, `status = INACTIVE`, `softDelete()`
- `product.isActive()` → `active == true`

## Category

Tabla: `categories`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `name` | `String` | `name VARCHAR(100)` | NOT NULL, unique parcial (case-insensitive) |
| `description` | `String` | `description TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio**:
- `Category.create(name, description)` → factory

## Enums

### UnitOfMeasure
```java
public enum UnitOfMeasure { KG, LB, UNIT, PACKAGE, LITER }
```

### ProductType
```java
public enum ProductType {
    CONSUMER_GOOD,       // Bien de consumo
    RAW_MATERIAL,        // Materia prima
    INTERNAL_SUPPLY,     // Insumo de uso interno
    SERVICE_ASSOCIATED   // Servicio
}
```

### ProductStatus
```java
public enum ProductStatus { DRAFT, ACTIVE, INACTIVE }
```
