---
tags: [modulo, procurement]
fecha: 2026-06-21
---

# Módulo: Procurement (Compras)

## Responsabilidad

Gestiona la relación con proveedores y el ciclo completo de compra: desde la creación de la orden hasta la recepción física de la mercancía. Al recibir, genera entradas en el módulo Inventory.

## Aggregate Roots

- **Proveedor** — [[modules/procurement/entities/supplier]]
- **OrdenCompra** — [[modules/procurement/entities/purchase-order]]

## Ciclo de vida de una compra

```
BORRADOR → ENVIADA → RECIBIDA_PARCIAL → RECIBIDA → CANCELADA
```

| Estado | Descripción |
|--------|-------------|
| `BORRADOR` | Orden en preparación, no enviada |
| `ENVIADA` | Enviada al proveedor, esperando |
| `RECIBIDA_PARCIAL` | Parte de la mercancía recibida |
| `RECIBIDA` | Toda la mercancía recibida |
| `CANCELADA` | Orden cancelada (no genera inventario) |

## Evento clave: MercancíaRecibida

Cuando se registra la recepción total o parcial de una orden, el sistema:

1. Crea un `Lote` por cada ítem recibido
2. Crea un `MovimientoInventario` de tipo `ENTRADA` por cada lote
3. Actualiza el estado de la orden
4. Genera factura de compra en Finance (si aplica)

## Reglas de negocio

1. Una orden cancelada no puede recibirse
2. Una orden completamente recibida no puede modificarse
3. La cantidad recibida no puede superar la cantidad pedida por ítem
4. El precio de compra queda registrado en el Lote para calcular costo de inventario

## Dependencias

| Dirección | Módulo | Cómo |
|-----------|--------|------|
| Escribe en | Inventory | Crea Lotes y Movimientos ENTRADA |
| Consulta | Catalog | Valida `producto_id` |
| Notifica a | Finance | Genera factura de compra |

## Paquete Java

`com.sapiens.erp.modules.procurement`

## Endpoints

`/api/v1/proveedores`, `/api/v1/ordenes-compra`

## Ver también

- [[modules/procurement/entities/supplier]]
- [[modules/procurement/entities/purchase-order]]
- [[architecture/integration-flows]]
