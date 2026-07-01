---
tags: [adr, inventario, stock, core-domain]
fecha: 2026-06-21
estado: Aceptado
---

# ADR-004: Stock Calculado desde Movimientos (Event Sourcing Light)

## Estado

Aceptado

## Contexto

El inventario es el corazón del ERP. Se necesita decidir cómo almacenar y consultar el stock. Hay dos enfoques: (A) campo `stock_actual` en la tabla `productos` que se actualiza con cada movimiento, o (B) calcular el stock sumando los movimientos históricos.

## Decisión

**El stock no se almacena** — se calcula en tiempo real sumando los movimientos de inventario de cada producto. No existe un campo `stock_actual` que se modifique directamente.

```sql
stock(productoId) =
  SUM(cantidad) WHERE tipo IN ('ENTRADA', 'AJUSTE_POSITIVO')
- SUM(cantidad) WHERE tipo IN ('SALIDA', 'MERMA', 'AJUSTE_NEGATIVO')
WHERE producto_id = productoId
```

## Opciones consideradas

### Opción A: Stock calculado ← Elegida

**Pros:**
- **Consistencia garantizada**: el stock nunca puede desincronizarse de los movimientos
- **Auditoría completa**: cada cambio de stock tiene su registro con fecha, usuario y motivo
- **Recalculable**: si se descubre un error, se puede recalcular el estado en cualquier fecha
- **Sin race conditions** de actualización concurrente del campo stock
- Alineado con principios de event sourcing

**Contras:**
- Consulta de stock más costosa que leer un campo
- Requiere índice en `movimientos_inventario(producto_id)` para rendimiento

### Opción B: Campo `stock_actual` en productos

**Pros:** Consulta O(1), simple de implementar

**Contras:**
- Riesgo de inconsistencia si una transacción falla a medio camino
- Requiere actualizar el campo en cada operación (race condition bajo concurrencia)
- Pérdida del historial si no se registran los movimientos también
- "Tentación" de editar el campo directamente (bypass de reglas de negocio)

## Consecuencias

**Positivas:**
- Integridad del inventario garantizada matemáticamente
- Historial completo y auditable
- Posibilidad de reportes "stock en fecha X"

**Negativas / Trade-offs:**
- Performance: la consulta de stock requiere un `SUM` sobre movimientos
- Mitigación: índice en `producto_id`, y si el volumen crece, vista materializada `v_stock_actual`

## Reglas derivadas

- No existe `stock_actual` como columna en `productos`
- No existe ningún setter ni endpoint que "establezca" el stock
- Toda modificación de stock pasa por la creación de un `MovimientoInventario`
- La tabla `movimientos_inventario` solo acepta `INSERT` — sin `UPDATE` ni `DELETE`
- Si el rendimiento se convierte en problema: implementar vista materializada actualizada por trigger (registrar como ADR-XXX)

_Ver implementación: [[modules/inventory/entities/stock]]_
_Ver reglas: [[modules/inventory/business-rules]]_
