---
tags: [catalog, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Producto (Clase: `Product`)

**Módulo**: [[modules/catalog/module]]
**Tipo**: Aggregate Root

> **Convención**: nombres en código (tabla, columnas, clase Java) en inglés. La documentación y el lenguaje ubicuo permanecen en español.

## Atributos

| Campo DB | Columna SQL | Campo Java | Tipo Java | Descripción |
|----------|-------------|------------|-----------|-------------|
| id | `id` | `id` | `UUID` | Clave primaria |
| nombre | `name` | `name` | `String` | Nombre comercial (único, case-insensitive) |
| categoría | `category_id` | `category` | `Category` | FK → categories |
| unidad de medida | `unit_of_measure` | `unitOfMeasure` | `UnitOfMeasure` | `KG` o `UNIT` |
| stock mínimo | `minimum_stock` | `minimumStock` | `BigDecimal` | Umbral para alerta de stock bajo |
| descripción | `description` | `description` | `String` | Descripción libre (nullable) |
| activo | `active` | `active` | `boolean` | Soft delete lógico |
| fecha de baja | `deleted_at` | `deletedAt` | `Instant` | Soft delete |
| creado en | `created_at` | `createdAt` | `Instant` | Auditoría |
| actualizado en | `updated_at` | `updatedAt` | `Instant` | Auditoría |

## Invariantes del agregado

- `name` es único entre productos activos (unicidad case-insensitive)
- `unitOfMeasure` no puede cambiar si el producto tiene movimientos registrados
- `minimumStock` debe ser ≥ 0
- Un producto inactivo no puede recibir nuevos movimientos

## Enum: `UnitOfMeasure`

```java
public enum UnitOfMeasure {
    KG,    // peso en kilogramos, hasta 3 decimales
    UNIT   // conteo entero
}
```

## Tabla en BD

```sql
CREATE TABLE products (
    id              UUID          PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    category_id     UUID          REFERENCES categories(id),
    unit_of_measure VARCHAR(10)   NOT NULL CHECK (unit_of_measure IN ('KG', 'UNIT')),
    minimum_stock   NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    description     TEXT,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_products_name_active
    ON products (LOWER(name))
    WHERE deleted_at IS NULL;
```

## DTOs

- `ProductRequest` — crear/actualizar (name, categoryId, unitOfMeasure, minimumStock, description)
- `ProductResponse` — respuesta API (incluye currentStock calculado desde Inventory)

## Ver también

- [[modules/inventory/entities/stock]] — cómo se calcula el stock de este producto
- [[modules/inventory/entities/movement]] — movimientos que afectan este producto
- [[_meta/GLOSSARY]]
