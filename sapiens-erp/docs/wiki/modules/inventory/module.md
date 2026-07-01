---
tags: [modulo, inventory, core-domain]
fecha: 2026-06-21
---

# Módulo: Inventory (Inventario) — Core Domain

## Responsabilidad

Es el **corazón del ERP**. Registra cada cambio en el stock como un Movimiento inmutable y calcula el estado actual del inventario a partir de ese historial. Es el único módulo que tiene autoridad sobre el stock.

## Aggregate Roots

1. **Movimiento** — el registro principal de cada cambio [[modules/inventory/entities/movement]]
2. **Lote** — partida de mercancía recibida [[modules/inventory/entities/lot]]
3. **Merma** — registro de pérdida de producto [[modules/inventory/entities/waste]]

## Concepto: Stock

El stock **no es una entidad** — es una proyección calculada:

```
stock(producto) = SUM(cantidad) WHERE tipo IN (ENTRADA, AJUSTE_POSITIVO)
               - SUM(cantidad) WHERE tipo IN (SALIDA, MERMA, AJUSTE_NEGATIVO)
               FILTER producto_id = :productoId
```

Ver [[modules/inventory/entities/stock]] y [[decisions/adr-004-stock-from-movements]].

## Tipos de movimiento

| Tipo | Efecto | Originado por |
|------|--------|---------------|
| `ENTRADA` | + stock | Recepción de compra (Procurement) |
| `SALIDA` | − stock | Venta confirmada (Sales) |
| `MERMA` | − stock | Registro manual de merma |
| `AJUSTE_POSITIVO` | + stock | Conteo físico (solo SUPERVISOR+) |
| `AJUSTE_NEGATIVO` | − stock | Conteo físico (solo SUPERVISOR+) |

## Reglas de negocio

Ver [[modules/inventory/business-rules]] — documento completo.

## Dependencias

| Dirección | Módulo | Evento |
|-----------|--------|--------|
| Recibe eventos de | Procurement | `MercancíaRecibida` → crea ENTRADA |
| Recibe eventos de | Sales | `VentaConfirmada` → crea SALIDA |
| Publica alertas a | (interno) | `StockBajoDetectado`, `VencimientoPróximo` |
| Consulta | Catalog | Para validar `producto_id` y `unidad_medida` |

## Paquete Java

`com.sapiens.erp.modules.inventory`

## Endpoints

`/api/v1/movimientos`, `/api/v1/lotes`, `/api/v1/mermas`, `/api/v1/alertas`, `/api/v1/stock`

## Ver también

- [[modules/inventory/business-rules]]
- [[modules/inventory/entities/movement]]
- [[modules/inventory/entities/lot]]
- [[modules/inventory/entities/waste]]
- [[modules/inventory/entities/stock]]
- [[architecture/integration-flows]]
