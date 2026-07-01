---
tags: [modulo, catalog]
fecha: 2026-06-21
---

# Módulo: Catalog (Catálogo)

## Responsabilidad

Define el **maestro de productos**: qué artículos existen, cómo se clasifican y en qué unidad se miden. Es la fuente de verdad para todo lo que el negocio puede comprar, vender o tener en inventario.

## Aggregate Root

**Producto** — ver [[modules/catalog/entities/product]]

## Qué pertenece a este módulo

- Productos (pescados, mariscos, insumos)
- Categorías de productos
- Unidades de medida (`KG`, `UNIDAD`)

## Qué NO pertenece a este módulo

- El stock de un producto → [[modules/inventory/module]]
- El precio de compra de un producto → [[modules/procurement/module]]
- El precio de venta de un producto → [[modules/sales/module]]

## Reglas de negocio

1. Un Producto activo puede tener stock.
2. La **unidad de medida es inmutable** una vez que el producto tiene movimientos — cambiarla requeriría recalcular el historial.
3. Dar de baja un Producto (soft delete) no elimina su historial de movimientos ni su stock.
4. No pueden existir dos productos activos con el mismo nombre (case-insensitive).

## Dependencias

| Dirección | Módulo | Cómo |
|-----------|--------|------|
| Consumido por | Inventory | `producto_id` en Lote y Movimiento |
| Consumido por | Procurement | `producto_id` en ÍtemOrdenCompra |
| Consumido por | Sales | `producto_id` en ÍtemVenta |

## Paquete Java

`com.sapiens.erp.modules.catalog`

## Endpoints

`/api/v1/productos`, `/api/v1/categorias`
_(Ver api/endpoints.md cuando se implemente)_

## Ver también

- [[modules/catalog/entities/product]]
- [[modules/inventory/module]]
- [[_meta/GLOSSARY]]
