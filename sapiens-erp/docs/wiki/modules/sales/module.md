---
tags: [modulo, sales]
fecha: 2026-06-21
---

# Módulo: Sales (Ventas)

## Responsabilidad

Gestiona clientes, el proceso de venta y el punto de venta (POS). Al confirmar una venta genera salidas en Inventory. El POS agrupa ventas de un turno y controla el cierre de caja con Finance.

## Aggregate Roots

- **Cliente** — [[modules/sales/entities/customer]]
- **Venta** — [[modules/sales/entities/sale]]
- **SesiónPOS** — [[modules/sales/entities/pos-session]]

## Canales de venta

| Canal | Descripción |
|-------|-------------|
| **POS** | Venta rápida en mostrador, sin cliente registrado o con cliente rápido |
| **Venta directa** | Venta a cliente registrado, puede ser a crédito |

## Ciclo de vida de una venta

```
PENDIENTE → CONFIRMADA → (ANULADA)
```

- `PENDIENTE`: venta en proceso de armado (carrito)
- `CONFIRMADA`: venta cerrada, genera movimientos de inventario
- `ANULADA`: solo SUPERVISOR puede anular, genera movimientos de compensación

## Evento clave: VentaConfirmada

Cuando una venta se confirma:

1. Sistema verifica stock suficiente para cada ítem (INV-003)
2. Sistema consume lotes en FIFO (INV-004)
3. Crea `MovimientoInventario` de tipo `SALIDA` por cada ítem
4. Actualiza estado de la venta a `CONFIRMADA`
5. Finance puede generar factura si se requiere

## Reglas de negocio

1. Una venta confirmada no puede modificarse — solo anularse
2. La anulación genera movimientos AJUSTE_POSITIVO para revertir el stock
3. El precio de venta queda registrado en el ítem al momento de la venta (no cambia si el precio del producto cambia después)
4. El POS solo puede operar dentro de una sesión abierta

## Dependencias

| Dirección | Módulo | Cómo |
|-----------|--------|------|
| Escribe en | Inventory | Crea Movimientos SALIDA |
| Consulta | Catalog | Valida `producto_id`, obtiene precio |
| Notifica a | Finance | Genera factura, cierre de caja |

## Paquete Java

`com.sapiens.erp.modules.sales`

## Endpoints

`/api/v1/clientes`, `/api/v1/ventas`, `/api/v1/pos/sesiones`, `/api/v1/pos/ventas`

## Ver también

- [[modules/sales/entities/customer]]
- [[modules/sales/entities/sale]]
- [[modules/sales/entities/pos-session]]
- [[architecture/integration-flows]]
