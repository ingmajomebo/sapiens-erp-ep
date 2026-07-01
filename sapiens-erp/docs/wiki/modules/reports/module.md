---
tags: [modulo, reports]
fecha: 2026-06-21
---

# Módulo: Reports (Reportes)

## Responsabilidad

Provee reportes y análisis transversales del negocio. Es un módulo de **solo lectura** — no posee entidades propias ni modifica datos.

## Reportes disponibles

| Reporte | Descripción | Módulos que consulta |
|---------|-------------|---------------------|
| Stock actual | Stock calculado de todos los productos | Inventory, Catalog |
| Movimientos por período | Historial de entradas y salidas | Inventory |
| Mermas por período | Pérdidas registradas con clasificación | Inventory |
| Rotación de productos | Velocidad de salida de cada producto | Inventory, Sales |
| Ventas por período | Resumen de ventas agrupadas por día/producto | Sales |
| Compras por período | Historial de compras a proveedores | Procurement |
| Cierre de caja diario | Resumen del día: ventas, gastos, neto | Finance, Sales |
| Alertas activas | Stock bajo y vencimientos próximos | Inventory |
| Rentabilidad por producto | Margen (precio venta − costo compra) | Sales, Inventory |

## Principios

- Las consultas de reportes pueden ser pesadas — usar índices y paginación
- Los reportes complejos (rentabilidad, rotación) pueden usar vistas materializadas
- Nunca modificar datos desde este módulo
- Los reportes exportables deben soportar formato CSV y PDF

## Paquete Java

`com.sapiens.erp.modules.reports`

## Endpoints

`/api/v1/reportes/stock`, `/api/v1/reportes/ventas`, `/api/v1/reportes/caja`, etc.

## Pendiente

- Definir el catálogo completo de reportes en `reports/available-reports.md`
- Evaluar si se necesita una capa de lectura separada (CQRS) para reportes complejos
