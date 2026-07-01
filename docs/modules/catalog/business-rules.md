# Catalog — Reglas de Negocio

## BR-CAT-01: Unicidad de nombre de producto

El nombre del producto debe ser único entre todos los productos activos (donde `deleted_at IS NULL`). La comparación es case-insensitive. Al intentar crear o actualizar un producto con un nombre ya existente, el sistema lanza `ProductNameAlreadyExistsException` → HTTP 409.

## BR-CAT-02: Auto-generación de SKU

Si el request de creación no incluye `sku`, el sistema genera uno automáticamente usando la secuencia PostgreSQL `product_sku_seq`:

```
SKU = "PRO-" + LPAD(nextval('product_sku_seq'), 6, '0')
Ejemplos: PRO-000001, PRO-000002, PRO-100043
```

Si el request incluye un `sku`, se verifica que no exista ya entre productos activos.

## BR-CAT-03: Unicidad de SKU

El SKU debe ser único entre productos activos (`deleted_at IS NULL`). Se implementa con un índice parcial en la BD. Si se intenta crear con un SKU duplicado, el sistema lanza excepción → HTTP 409.

## BR-CAT-04: Cálculo de costo promedio ponderado

Cuando Inventory registra una entrada de stock, delega en `Product.applyEntryAndRecalculateCost()`. La fórmula es:

```
nuevoCostoPromedio = (stockActual * costoPromedioActual + cantidadEntrada * costoEntrada)
                     / (stockActual + cantidadEntrada)
```

El método también actualiza `purchaseCostLast` con el costo de la entrada más reciente. Retorna el costo promedio anterior para que Inventory lo registre en el movimiento.

**Contrato de integración**: Solo `InventoryService` debe llamar a este método. Ningún otro servicio modifica `averageCost` directamente.

## BR-CAT-05: Desactivación de producto

`ProductService.deactivate()` ejecuta en una transacción:
1. Verifica existencia del producto
2. Llama `product.deactivate()` → `active = false`, `status = INACTIVE`, `deletedAt = now()`

Un producto desactivado no aparece en listados de catálogo activo ni en búsquedas de Procurement o Inventory (filtros con `deleted_at IS NULL`).

**Nota**: No se verifica si el producto tiene stock pendiente o lotes activos antes de desactivar. Es una observación del arquitecto (ver sección abajo).

## BR-CAT-06: Importación masiva

`ProductService.importBulk()` acepta una lista de `ProductRequest`. En caso de conflicto (nombre o SKU ya existe), el producto conflictivo se omite silenciosamente (no lanza excepción). Retorna solo los productos creados exitosamente.

## BR-CAT-07: Soft delete de categorías

Las categorías usan soft-delete. Al eliminar una categoría, los productos que la referenciaban quedan con `category_id` apuntando a un registro de categoría con `deleted_at != NULL`. No existe lógica de reasignación o bloqueo en el backend.

---

## Observaciones del Arquitecto

### OBS-CAT-01: Sin validación de productos con stock al desactivar
Al desactivar un producto, no se verifica si tiene lotes con stock positivo ni órdenes de compra pendientes. Esto puede generar productos "invisibles" con stock real en el inventario. Se recomienda agregar esta validación.

### OBS-CAT-02: `CategoryController` crea con `@RequestParam`
El endpoint `POST /api/v1/categories` recibe nombre y descripción como query parameters, no como JSON body. Es inconsistente con todos los demás endpoints de la API. Ver `modules/catalog/api.md` para detalles.

### OBS-CAT-03: `ProductType` nullable
El campo `productType` es nullable en BD y en entidad. No hay validación de que sea obligatorio para productos con `inventoryTrackingEnabled = true`. Es un campo meramente informativo por ahora.
