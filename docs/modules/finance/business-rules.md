# Finance — Reglas de Negocio

## BR-FIN-01: Generación de número de factura

Al crear una AP desde una recepción, el sistema genera un número de factura usando la secuencia `invoice_number_seq`:

```
invoiceNumber = "FAC-" + LPAD(nextval('invoice_number_seq'), 6, '0')
Ejemplos: FAC-000001, FAC-000002
```

## BR-FIN-02: Fecha de vencimiento de AP

La fecha de vencimiento se calcula como:
```
dueDate = purchaseOrder.expectedDelivery + 30 días
```
Si `expectedDelivery` es null:
```
dueDate = NOW() + 30 días
```

No existe actualmente una regla de plazo negociable por proveedor.

## BR-FIN-03: Validación de monto de pago

Al registrar un pago (`registerPayment()`), se valida:
```
if (amount <= 0 || amount > ap.pendingAmount()) → 400 Bad Request
```

No se puede pagar más del saldo pendiente.

## BR-FIN-04: Actualización de AP tras pago

Después de crear el `SupplierPayment`:
1. `ap.registerPayment(amount)` incrementa `paidAmount`
2. Si `paidAmount >= totalAmount` → `status = PAID`
3. Si `paidAmount < totalAmount` → `status = PARTIALLY_PAID`

## BR-FIN-05: Descuento del saldo de cuenta financiera

Si el request de pago incluye `financialAccountId`:
1. Se verifica que la `FinancialAccount` exista y esté activa
2. Se llama `FinancialAccountService.registerExpense(accountId, amount, description, supplierId)`
3. `FinancialMovement.createExpense()` captura el saldo antes y después
4. `account.applyExpense()` decrementa `balance`
5. Todo en la misma transacción

**No se valida que el saldo de la cuenta sea suficiente.** El balance puede quedar negativo.

## BR-FIN-06: Seed de cuentas iniciales (V13)

La migración V13 inserta dos cuentas financieras por defecto:
- `Caja Principal` (tipo CASH, saldo inicial 0, moneda CLP)
- `Cuenta Bancaria` (tipo BANK, saldo inicial 0, moneda CLP)

---

## Observaciones del Arquitecto

### OBS-FIN-BR-01: Sin validación de saldo negativo en cuenta
Al registrar un egreso, no se verifica si el saldo de la `FinancialAccount` es suficiente. El balance puede quedar negativo, lo que puede no ser intencional para cuentas de caja física.

### OBS-FIN-BR-02: `OVERDUE` es estado UI no persistido
El frontend muestra las AP como `OVERDUE` cuando `dueDate < hoy && status IN (PENDING, PARTIALLY_PAID)`, pero este no es un valor en BD. No existe un job o trigger que actualice el status a `OVERDUE`. El cálculo es 100% en frontend.

### OBS-FIN-BR-03: Sin regla de pago parcial mínimo
No hay restricción de monto mínimo por pago. Se puede registrar un pago de $1 en una AP de $1.000.000.
