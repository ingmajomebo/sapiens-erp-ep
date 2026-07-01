---
tags: [inventory, reglas-negocio, invariantes]
fecha: 2026-06-21
---

# Reglas de Negocio — Inventory

> Este es el documento más crítico del ERP. Estas reglas son invariantes del sistema. Cualquier implementación que las viole es incorrecta.

---

## INV-001 — El stock nunca se edita directamente

**Regla**: No existe ningún endpoint ni operación que permita establecer o modificar el valor del stock de un producto directamente.

**Implementación**: El stock es una consulta agregada sobre la tabla `movimientos_inventario`.

```java
// CORRECTO
BigDecimal stock = movimientoRepository.calcularStock(productoId);

// INCORRECTO — esto nunca debe existir
producto.setStockActual(nuevoValor); // ❌
```

**Ver**: [[decisions/adr-004-stock-from-movements]]

---

## INV-002 — Los movimientos son inmutables

**Regla**: Un Movimiento creado nunca se modifica ni elimina. Es un registro de auditoría.

**Corrección de errores**: Se registra un movimiento de compensación (ej. si se ingresó 10 kg de más en una ENTRADA, se crea un AJUSTE_NEGATIVO de 10 kg con referencia al movimiento original).

**En BD**: No hay `UPDATE` ni `DELETE` sobre `movimientos_inventario`. Solo `INSERT`.

---

## INV-003 — Stock nunca negativo

**Regla**: Ninguna operación puede resultar en un stock negativo para un producto.

**Validación**: Antes de crear cualquier movimiento de egreso (SALIDA, MERMA, AJUSTE_NEGATIVO), el servicio verifica:

```java
if (stockActual.compareTo(cantidadSolicitada) < 0) {
    throw new StockInsuficienteException(productoId, stockActual, cantidadSolicitada);
}
```

**Respuesta HTTP**: `422 Unprocessable Entity` con error `STOCK_INSUFICIENTE`.

---

## INV-004 — Estrategia FIFO para consumo de lotes

**Regla**: Al registrar una SALIDA o MERMA, los lotes se consumen en orden FIFO (First In, First Out): el lote con `fecha_ingreso` más antigua se agota primero. Entre lotes de la misma fecha, el de menor `id` (lexicográfico).

**Motivo**: Los productos más viejos deben salir primero para minimizar vencimientos.

**Implementación**: El servicio de movimientos llama a `loteRepository.findByProductoIdOrderByFechaIngresoAscIdAsc(productoId)` y consume lotes en ese orden hasta cubrir la cantidad solicitada. Un movimiento puede consumir parcialmente múltiples lotes — se registra un `MovimientoLote` por cada lote tocado.

---

## INV-005 — Precisión decimal para productos por peso

**Regla**: Los productos con `unidad_medida = KG` admiten hasta 3 decimales (precisión en gramos). No se redondea el stock intermedio.

**En BD**: `NUMERIC(10,3)` para cantidades de productos KG.

**Validación**: La cantidad de un movimiento de producto KG puede ser decimal (ej. 2.500 kg). La cantidad de un producto UNIDAD debe ser entero positivo.

---

## INV-006 — Alerta de stock mínimo

**Regla**: Después de registrar cualquier movimiento de egreso (SALIDA, MERMA, AJUSTE_NEGATIVO), el sistema verifica si `stockActual <= producto.stockMinimo`. Si se cumple y no existe ya una alerta ACTIVA del tipo `STOCK_MINIMO` para ese producto, se crea una nueva.

**No duplicar alertas**: Si ya existe una alerta `STOCK_MINIMO` ACTIVA para el producto, no se crea otra.

**Resolución**: La alerta `STOCK_MINIMO` se resuelve automáticamente cuando un movimiento de ingreso deja `stockActual > producto.stockMinimo`.

---

## INV-007 — Alerta de vencimiento próximo

**Regla**: Un proceso programado (cron diario) revisa todos los lotes con `cantidad_disponible > 0` y `fecha_vencimiento IS NOT NULL`. Si `fecha_vencimiento - hoy <= umbral_dias` (configurable, default 2), crea una alerta `VENCIMIENTO_PROXIMO` si no existe ya una ACTIVA para ese lote.

**Alerta de lote vencido**: Si `fecha_vencimiento < hoy` y `cantidad_disponible > 0`, crea alerta `LOTE_VENCIDO`. Esta alerta requiere acción obligatoria (registrar merma del lote vencido).

---

## INV-008 — Merma requiere motivo

**Regla**: Todo movimiento de tipo `MERMA` debe incluir un campo `motivo` no vacío (ej. "Vencimiento", "Rotura", "Deterioro"). Sin motivo, la operación es rechazada.

---

## INV-009 — Ajustes requieren rol SUPERVISOR o superior

**Regla**: Los movimientos de tipo `AJUSTE_POSITIVO` y `AJUSTE_NEGATIVO` solo pueden ser creados por usuarios con rol `SUPERVISOR` o `ADMIN`. Un `OPERADOR` no puede realizar ajustes de inventario.

**Motivo**: Los ajustes son la única forma de "corregir" el stock y deben tener control estricto.

---

## INV-010 — Un lote pertenece a una sola orden de compra

**Regla**: Cada Lote está asociado a exactamente una recepción de mercancía (OrdenCompra). No se puede asignar un lote a múltiples compras retroactivamente.

---

## Resumen de validaciones por tipo de movimiento

| Tipo | Stock suficiente | Motivo requerido | Rol mínimo | Genera alerta |
|------|-----------------|-----------------|-----------|---------------|
| ENTRADA | — | No | OPERADOR | Revisa vencimiento |
| SALIDA | ✅ | No | OPERADOR | Revisa stock mínimo |
| MERMA | ✅ | ✅ | OPERADOR | Revisa stock mínimo |
| AJUSTE_POSITIVO | — | Recomendado | SUPERVISOR | — |
| AJUSTE_NEGATIVO | ✅ | ✅ | SUPERVISOR | Revisa stock mínimo |

## Ver también

- [[modules/inventory/module]]
- [[modules/inventory/entities/movement]]
- [[decisions/adr-004-stock-from-movements]]
- [[overview/cross-cutting]]
