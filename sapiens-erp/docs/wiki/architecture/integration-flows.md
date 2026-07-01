---
tags: [arquitectura, integracion, flujos]
fecha: 2026-06-21
---

# Flujos de Integración entre Módulos

> Documenta cómo los módulos se coordinan. Los módulos no se llaman directamente entre sí — publican y consumen eventos de dominio.

---

## Flujo 1: Recepción de Compra → Inventario

**Trigger**: Operador registra la recepción de una Orden de Compra

```
Procurement                     Inventory
    │                               │
    ├─ Valida OrdenCompra (ENVIADA) │
    ├─ Registra cantidades recibidas│
    ├─ Actualiza estado de la OC   │
    │                               │
    ├──── MercancíaRecibida ───────▶│
    │     { itemsRecibidos,         │
    │       proveedorId,            │
    │       ordenCompraId }         │
    │                               ├─ Crea Lote por cada ítem
    │                               ├─ Crea MovimientoInventario ENTRADA
    │                               ├─ Verifica alertas vencimiento
    │                               └─ Verifica alertas stock mínimo (resuelve)
    │                               │
Finance                             │
    │◀──── OrdenCompraRecibida ─────┤
    │                               │
    └─ Genera Factura de Compra
```

**Datos del Lote creado:**
- `producto_id`, `proveedor_id`, `orden_compra_id`
- `cantidad` = cantidad recibida
- `precio_compra` = precio del ítem en la OC
- `fecha_ingreso` = hoy
- `fecha_vencimiento` = si aplica al producto

---

## Flujo 2: Venta Confirmada → Inventario

**Trigger**: Operador confirma una venta (POS o venta directa)

```
Sales                           Inventory
    │                               │
    ├─ Construye ítems de venta     │
    │                               │
    ├──── ConsultarStock ──────────▶│
    │◀─── stockDisponible ──────────┤
    │                               │
    ├─ Valida stock suficiente      │
    ├─ Confirma la Venta            │
    │                               │
    ├──── VentaConfirmada ─────────▶│
    │     { items: [               │
    │       { productoId,          │
    │         cantidad }] }        │
    │                               ├─ Por cada ítem:
    │                               │   ├─ Selecciona lotes FIFO
    │                               │   ├─ Crea MovimientoInventario SALIDA
    │                               │   └─ Actualiza movimientos_lote
    │                               ├─ Verifica alertas stock mínimo
    │                               │
Finance                             │
    │◀──── VentaConfirmada ─────────┤
    │                               │
    └─ Genera Factura (si aplica)
```

**Nota FIFO**: Si una venta de 5 kg de Merluza consume lotes:
- Lote A: 3 kg (fecha 2026-06-10) → se agota
- Lote B: 2 kg (fecha 2026-06-15) → consumo parcial

Se crean 2 registros en `movimientos_lote`.

---

## Flujo 3: Registro de Merma → Inventario

**Trigger**: Operador registra pérdida de producto

```
Inventory (interno)
    │
    ├─ Operador registra Merma { producto, cantidad, tipo, motivo }
    ├─ Valida stock suficiente
    ├─ Crea MovimientoInventario tipo MERMA
    ├─ Crea registro Merma vinculado al Movimiento
    ├─ Selecciona lotes FIFO y registra en movimientos_lote
    └─ Verifica alerta stock mínimo
```

---

## Flujo 4: Cierre de Sesión POS → Finanzas

**Trigger**: Supervisor cierra la sesión POS

```
Sales                           Finance
    │                               │
    ├─ Operador declara monto final │
    ├─ Sistema calcula monto esperado│
    │  (apertura + ventas efectivo  │
    │   − gastos en caja)           │
    ├─ Calcula diferencia            │
    ├─ Marca sesión CERRADA          │
    │                               │
    ├──── SesiónPOSCerrada ────────▶│
    │     { sesionId,               │
    │       montoApertura,          │
    │       montoVentasEfectivo,    │
    │       montoDeclarado,         │
    │       diferencia }            │
    │                               ├─ Registra MovimientoCaja CIERRE
    │                               └─ Genera resumen del día
```

---

## Flujo 5: Alerta de vencimiento (cron diario)

```
Inventory (scheduled job — 06:00 AM)
    │
    ├─ Busca lotes con cantidad_disponible > 0 y fecha_vencimiento NOT NULL
    ├─ Para cada lote:
    │   ├─ Si fecha_vencimiento - hoy <= umbral_dias (default 2):
    │   │   └─ Crea alerta VENCIMIENTO_PROXIMO (si no existe ACTIVA)
    │   └─ Si fecha_vencimiento < hoy:
    │       └─ Crea alerta LOTE_VENCIDO (si no existe ACTIVA)
    └─ FIN
```

---

## Reglas de integración

1. Los módulos **no llaman directamente** al repositorio de otro módulo
2. La consulta de stock (`ConsultarStock`) es síncrona — el módulo Sales necesita el stock antes de confirmar
3. Los eventos post-confirmación (`VentaConfirmada`, `MercancíaRecibida`) pueden ser síncronos en V1 y asíncronos (mensajería) en versiones futuras
4. Si falla la creación de movimientos de inventario al confirmar una venta → se revierte la transacción completa (ambas operaciones en la misma transacción de BD en V1)

## Ver también

- [[overview/bounded-contexts]]
- [[modules/inventory/business-rules]]
- [[architecture/overview]]
