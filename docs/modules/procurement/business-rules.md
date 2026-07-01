# Procurement — Reglas de Negocio

## BR-PROC-01: Auto-generación de número de OC

Al crear una OC, el servicio genera un número único usando la secuencia PostgreSQL `po_number_seq` (inicia en 1001):

```
orderNumber = "OC-" + nextval('po_number_seq')
Ejemplos: OC-1001, OC-1002, OC-2500
```

El número es inmutable una vez asignado.

## BR-PROC-02: Solo OC en DRAFT puede modificarse

Las transiciones de estado permitidas son:
- `DRAFT → CONFIRMED`: mediante `confirm()`
- `DRAFT → CANCELLED`: mediante `cancel()`
- `CONFIRMED → RECEIVED` o `PARTIALLY_RECEIVED`: mediante `receive()`
- `CONFIRMED → CANCELLED`: mediante `cancel()`
- `PARTIALLY_RECEIVED → RECEIVED`: mediante `receive()` (completando el resto)

No es posible editar líneas de una OC que ya no esté en DRAFT.

## BR-PROC-03: Recepción crea entradas de inventario

Al llamar `receive()`, por cada línea recibida:
1. Se llama `InventoryService.registerEntry(productId, receivedQty, unitPrice, expirationDate, supplierBatchCode)`
2. El stock del producto se incrementa
3. El costo promedio del producto se recalcula
4. Se actualiza `PurchaseOrderLine.receivedQuantity`

Todo dentro de la misma transacción (`@Transactional` en `PurchaseOrderService`).

## BR-PROC-04: Determinación de estado post-recepción

Después de procesar una recepción:
```
Si TODAS las líneas tienen receivedQuantity >= quantity → RECEIVED
Si AL MENOS UNA línea tiene receivedQuantity < quantity → PARTIALLY_RECEIVED
```

## BR-PROC-05: Recepción genera cuenta por pagar

Al procesar una recepción, `PurchaseOrderService` llama a `AccountsPayableService.createFromReceipt(receipt)`:
- Se genera un número de factura con la secuencia `invoice_number_seq`: `FAC-000001`
- La fecha de vencimiento = `expectedDelivery + 30 días` (o `NOW() + 30 días` si no hay expectedDelivery)
- El monto total = suma de `(receivedQty * unitPrice * (1 + taxRate))` por línea

## BR-PROC-06: Líneas de OC con descuento e impuesto

Cada línea calcula su monto como:
```
lineSubtotal = quantity * unitPrice * (1 - discount/100)
lineTax = lineSubtotal * (taxRate/100)
lineTotal = lineSubtotal + lineTax
```

---

## Observaciones del Arquitecto

### OBS-PROC-BR-01: Sin validación de cantidad mínima por recepción
No hay regla que impida recibir 0 unidades en una recepción. Podría crear movimientos de inventario con cantidad 0, pero el CHECK `quantity > 0` en `inventory_movements` lo bloquearía a nivel de BD.

### OBS-PROC-BR-02: `expectedDelivery` no es obligatorio
El campo `expectedDelivery` es nullable. Si no está presente, la fecha de vencimiento de la AP se calcula como `NOW() + 30 días`, lo que puede no reflejar el acuerdo real con el proveedor.

### OBS-PROC-BR-03: No existe flujo de devolución
No hay entidades ni endpoints para registrar devoluciones a proveedor. Una devolución actualmente requeriría un ajuste negativo de inventario manual y un abono manual en la AP.
