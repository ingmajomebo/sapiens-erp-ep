# Inventory — Reglas de Negocio

## BR-INV-01: Stock calculado por suma de movimientos

El stock actual de un producto no existe como columna en ninguna tabla. Se calcula en tiempo real como:

```sql
SELECT COALESCE(SUM(
    CASE
        WHEN movement_type IN ('ENTRY', 'POSITIVE_ADJUSTMENT') THEN quantity
        WHEN movement_type IN ('EXIT', 'WASTE', 'NEGATIVE_ADJUSTMENT') THEN -quantity
    END
), 0) AS stock_actual
FROM inventory_movements
WHERE product_id = :productId
```

En Java, `InventoryService.getCurrentStock(productId)` ejecuta esta consulta via `InventoryMovementRepository`.

## BR-INV-02: Inmutabilidad de movimientos

La tabla `inventory_movements` tiene una RULE PostgreSQL que lanza un error si se intenta UPDATE o DELETE. Esto es una garantía a nivel de BD, independiente de la capa de aplicación.

```sql
-- De V4
CREATE RULE no_update_inventory AS ON UPDATE TO inventory_movements DO INSTEAD NOTHING;
CREATE RULE no_delete_inventory AS ON DELETE TO inventory_movements DO INSTEAD NOTHING;
```

No existe `InventoryMovementService.update()` ni `delete()`.

## BR-INV-03: Stock no negativo

Antes de registrar cualquier egreso (EXIT, WASTE, NEGATIVE_ADJUSTMENT), el servicio verifica:

```java
BigDecimal currentStock = getCurrentStock(productId);
if (currentStock.compareTo(quantity) < 0) {
    throw new InsufficientStockException(productId, currentStock, quantity);
}
```

Resultado: HTTP 422 con mensaje descriptivo.

## BR-INV-04: FIFO para consumo de lotes

Al registrar salidas, mermas o ajustes negativos, los lotes se consumen en orden `received_at ASC`:

1. Consultar lotes del producto con `currentQuantity > 0` ordenados por `received_at ASC`
2. Consumir del lote más antiguo hasta agotar la cantidad requerida
3. Si un lote no alcanza, pasar al siguiente
4. Por cada lote consumido, actualizar `lot.currentQuantity` y crear un registro en `movement_lots`

## BR-INV-05: Merma requiere motivo

En `registerWaste()`, el campo `reason` es obligatorio. Si llega vacío o null:
- Validación `@NotBlank` en el DTO → HTTP 400
- O validación explícita en el servicio → `IllegalArgumentException`

## BR-INV-06: Costo promedio ponderado en entradas

Al registrar una `ENTRY`:
1. Obtener stock actual del producto
2. Llamar `product.applyEntryAndRecalculateCost(currentStock, entryQty, entryCost)` que:
   - Calcula `nuevoPromedio = (stock * costoActual + qty * costoEntrada) / (stock + qty)`
   - Actualiza `product.averageCost = nuevoPromedio`
   - Actualiza `product.purchaseCostLast = costoEntrada`
   - Retorna el costo promedio anterior
3. El movimiento registra `previousAverageCost` y `newAverageCost` para auditoría

## BR-INV-07: Ajustes

`registerAdjustment()` maneja tanto ajustes positivos como negativos:
- `POSITIVE_ADJUSTMENT`: crea un Lot nuevo con la cantidad ajustada y registra movimiento
- `NEGATIVE_ADJUSTMENT`: consume lotes FIFO y registra movimiento. Requiere `reason`.

---

## Observaciones del Arquitecto

### OBS-INV-01: `Lot` sin protección DB-level
Solo `inventory_movements` tiene RULE de inmutabilidad. Los lotes son mutables a nivel de BD (UPDATE de `current_quantity`). La consistencia depende de que solo `InventoryService` actualice lotes.

### OBS-INV-02: `movement_lots` en ENTRY
Al registrar una entrada, se crea un Lot nuevo y un registro en `movement_lots` que apunta al nuevo lote con la cantidad completa. Esto es correcto y permite rastrear de qué movimiento proviene cada lote.

### OBS-INV-03: No existe fecha de vencimiento con alertas
El campo `expirationDate` en `Lot` existe pero no hay ningún servicio que genere alertas por productos próximos a vencer.
