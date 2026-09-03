---
tags: [arquitectura, flujos, ventas, inventario, storefront]
fecha: 2026-08-24
---

# Flujo de venta: de la tienda pública al descuento de inventario

> Recorrido completo de un pedido del cliente final hasta que el stock baja.
> Verificado de punta a punta el 2026-08-24 con el pedido `EP-001006`.

Relacionado: [[architecture/integration-flows]] · [[modules/sales/module]] ·
[[modules/inventory/business-rules]] · [[decisions/adr-004-stock-from-movements]]

---

## El punto que más confunde

**El inventario NO se descuenta al entregar el pedido. Se descuenta al emitir
la factura.**

Un pedido puede recorrer *Pendiente → Preparación → Despacho → Entregado* sin
tocar una sola unidad de stock. El egreso ocurre en
`SalesInvoiceService.emit()`, que llama a `decrementStockForSale()`.

Es deliberado: el movimiento de inventario queda atado al documento que
respalda la venta, no al estado logístico. Si el pedido se entrega pero la
factura se anula, la reposición tiene un documento contra el cual reversarse.

---

## Diagrama de secuencia

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Helvetica, Arial, sans-serif",
    "fontSize": "13px",
    "actorBkg": "#A8E6C0",
    "actorBorder": "#2E7D5B",
    "actorTextColor": "#123328",
    "actorLineColor": "#9A9686",
    "signalColor": "#2B2B2B",
    "signalTextColor": "#2B2B2B",
    "activationBkgColor": "#F2A354",
    "activationBorderColor": "#B96A15",
    "sequenceNumberColor": "#123328",
    "noteBkgColor": "#FFF3C4",
    "noteBorderColor": "#C9A227",
    "noteTextColor": "#3A2E00",
    "labelBoxBkgColor": "#A8E6C0",
    "labelBoxBorderColor": "#2E7D5B",
    "labelTextColor": "#123328",
    "loopTextColor": "#2B2B2B",
    "altSectionBkgColor": "#FBF6E7"
  }
}}%%
sequenceDiagram
    autonumber
    actor C as Cliente
    participant T as Tienda online
    participant SO as Pedido público
    participant V as Pedido de venta
    actor A as Operador
    participant F as Factura
    participant I as Inventario
    participant BD as Base de datos

    Note over C,BD: 1 · Compra en la tienda pública

    C->>+T: buscar y seleccionar productos
    T->>+BD: consultar catálogo publicado
    BD-->>-T: productos con precio y stock
    T-->>C: mostrar productos

    C->>T: confirmar compra
    T->>+SO: crear pedido
    SO->>+BD: verificar stock disponible
    BD-->>-SO: existencias actuales
    Note right of SO: Solo VERIFICA.<br/>No reserva ni descuenta.
    SO->>BD: guardar pedido PENDIENTE + líneas
    SO-->>-T: número, token y total
    T-->>-C: página de seguimiento

    Note over C,BD: 2 · Despacho — sin efecto en inventario

    A->>+V: preparar, despachar, entregar
    V->>BD: PENDIENTE → PREPARACIÓN → DESPACHO → ENTREGADO
    Note right of V: Ninguna transición<br/>mueve stock.
    V-->>-A: estado actualizado

    Note over C,BD: 3 · Factura

    A->>+F: generar factura del pedido
    F->>BD: guardar BORRADOR y congelar líneas
    Note right of F: Sin número todavía:<br/>se asigna al emitir.
    F-->>-A: borrador creado

    Note over C,BD: 4 · Emisión — AQUÍ baja el stock

    A->>+F: emitir factura
    F->>BD: asignar número FV-NNNNNN · EMITIDA
    F->>+I: registrar salida por cada línea
    I->>+BD: stock en la UBICACIÓN de salida
    BD-->>-I: existencias en esa bodega

    alt Stock suficiente
        I->>BD: guardar SALIDA (FIFO por lote)
        I-->>F: confirmado
        F-->>A: factura emitida
    else Stock insuficiente
        I-->>-F: excepción de stock
        Note right of F: La transacción revierte:<br/>la factura vuelve a BORRADOR.
        F-->>A: 422 sin stock en la ubicación
    end
    deactivate F

    Note over C,BD: 5 · Cobro

    A->>+F: registrar pago
    F->>BD: guardar pago · PAGO PARCIAL o PAGADA
    F-->>-A: comprobante
    F-->>C: enviar notificación al cliente
```

En la interfaz, los pasos 4 y 5 están unidos: el botón **Cobrar** de un
borrador emite y registra el pago en una sola acción. No existe botón
«Emitir» por separado, aunque la API sí lo expone.

---

## La trampa de las dos medidas de stock

El sistema calcula existencias de dos maneras distintas, y **no siempre
coinciden**:

| Quién pregunta | Consulta | Considera la ubicación |
|---|---|---|
| La tienda, para mostrar disponibilidad | `calculateCurrentStock(productId)` | **No** |
| La factura, para descontar | `calculateStockAtLocation(productId, locationId)` | **Sí** |

Si una entrada se registró sin bodega, el producto suma al total pero no
pertenece a ninguna ubicación. La tienda lo vende y la emisión falla con
`422 INSUFFICIENT_STOCK_AT_LOCATION`.

Ocurrió de verdad: siete entradas quedaron sin bodega porque `warehouseId` era
opcional en `EntryRequest`. Se corrigió con el script del repositorio
`deploy/reparacion/entradas-sin-bodega.sql` (fuera del vault, por eso no lleva
enlace interno).

> Mientras las dos consultas difieran, seguirá siendo posible vender algo que
> después no se puede despachar. La solución de fondo es que la tienda mida la
> disponibilidad por ubicación, igual que la factura.

---

## Los movimientos no se pueden editar

Corregir datos de inventario con `UPDATE` **no funciona y no avisa**. La base
lo impide con reglas que descartan la operación en silencio:

```sql
CREATE RULE no_update_inventory_movements
  AS ON UPDATE TO inventory_movements DO INSTEAD NOTHING;
CREATE RULE no_delete_inventory_movements
  AS ON DELETE TO inventory_movements DO INSTEAD NOTHING;
```

Un `UPDATE` devuelve `UPDATE 0` sin error. Toda corrección se hace con
movimientos nuevos que compensen:

```
ENTRY  10  (sin bodega)          <- se queda: es lo que ocurrió
+ AJUSTE +10 -> Bodega principal <- pone el stock donde existe
+ AJUSTE -10 <- sin ubicación    <- retira el fantasma
------------------------------------
  total 10  ·  en bodega 10
```

Los **lotes** sí admiten actualización: no son historia, son el estado actual,
y el FIFO por ubicación necesita saber dónde está cada uno.

---

## Estados

```
Pedido     PENDING -> PREPARING -> DISPATCHED -> DELIVERED
                                              \-> CANCELLED

Factura    DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID
                        \-> CANCELLED (genera nota crédito)
```

Anular una factura ya emitida repone el stock con un `POSITIVE_ADJUSTMENT`
(`restoreStockForSale`), nunca borrando el `EXIT` original.

---

## Deuda conocida

- **El envío no se factura.** El cliente paga el domicilio, el valor queda en
  `sales_orders.shipping_cost` y no llega a la factura. Se factura por debajo
  de lo cobrado.
- **Sin botón «Emitir»** en la interfaz: un borrador solo ofrece *Cobrar*, que
  hace las dos cosas. No se puede emitir a crédito sin cobrar.
- **`warehouseId` opcional al ingresar** mercancía: la causa de que el stock
  pueda quedar fuera de toda bodega.
