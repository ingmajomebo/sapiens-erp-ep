---
tags: [inventory, stock, proyeccion]
fecha: 2026-06-21
---

# Concepto: Stock

## Qué es

El stock **no es una entidad persistida**. Es una **proyección calculada** a partir de los Movimientos de Inventario.

## Fórmula

```sql
SELECT
    producto_id,
    SUM(CASE WHEN tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN cantidad ELSE 0 END)
  - SUM(CASE WHEN tipo IN ('SALIDA', 'MERMA', 'AJUSTE_NEGATIVO') THEN cantidad ELSE 0 END)
    AS stock_actual
FROM movimientos_inventario
WHERE producto_id = :productoId
GROUP BY producto_id;
```

## Por qué se calcula y no se almacena

Ver [[decisions/adr-004-stock-from-movements]].

En resumen: almacenar el stock como campo crea riesgo de inconsistencia. Al calcularlo desde movimientos, el stock es siempre exacto y el historial completo.

## Stock por lote

Para saber cuánto queda de un lote específico:

```sql
SELECT lote_id, SUM(cantidad_egreso) as consumido
FROM movimientos_lote
WHERE lote_id = :loteId;

-- stock_lote = lote.cantidad - consumido
```

## Consulta de stock en el backend

```java
// InventarioService
public BigDecimal calcularStock(UUID productoId) {
    return movimientoRepository.sumStockByProductoId(productoId);
}
```

El endpoint `GET /api/v1/stock/{productoId}` retorna el stock calculado en tiempo real.

## Ver también

- [[modules/inventory/entities/movement]]
- [[modules/inventory/business-rules]]
- [[decisions/adr-004-stock-from-movements]]
