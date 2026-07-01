# Finance — Frontend

## Pantalla: AccountsPayablePage.tsx

Archivo: `frontend/src/features/finance/AccountsPayablePage.tsx`

### Funcionalidades implementadas

1. **Lista de APs** con filtro por estado y proveedor
2. **Indicador visual de `OVERDUE`**: APs con `dueDate < hoy` y status en PENDING/PARTIALLY_PAID se etiquetan como "Vencida" (cálculo en cliente, no viene del backend)
3. **Modal con tres modos**:
   - `detail`: Muestra datos completos de la AP
   - `pay`: Formulario de pago con selector de cuenta financiera (carga cuentas disponibles desde `cashBanksApi`)
   - `history`: Tabla de pagos realizados sobre la AP
4. **Selector de cuenta financiera en pago**: carga `GET /financial-accounts` para mostrar saldo disponible por cuenta

### API calls

Archivo: `frontend/src/features/finance/api/accountsPayableApi.ts`

```typescript
getAccountsPayable(params?: FilterParams): Promise<Page<AccountsPayableResponse>>
getAccountsPayable(id: string): Promise<AccountsPayableDetail>
pay(id: string, data: PaymentRequest): Promise<AccountsPayableResponse>
```

```typescript
interface PaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  paymentOrigin?: string;
  supplierAccount?: string;
  referenceNumber?: string;
  financialAccountId?: string;
  notes?: string;
}
```

---

## Pantalla: CashBanks.tsx

Archivo: `frontend/src/features/finance/CashBanks.tsx`

### Funcionalidades implementadas

1. **Vista de tarjetas** — cada cuenta financiera se muestra como una card con nombre, tipo, saldo y moneda
2. **CRUD de cuentas**: crear, editar y desactivar cuentas
3. **Modal de movimientos**: al hacer click en una cuenta, muestra su historial de movimientos (`balance_before`, `amount`, `balance_after`, tipo, fecha)
4. **Registro de ingreso manual**: formulario para depositar fondos en una cuenta (llama a `POST /financial-accounts/{id}/income`)

### API calls

Archivo: `frontend/src/features/finance/api/cashBanksApi.ts`

```typescript
getFinancialAccounts(): Promise<FinancialAccountResponse[]>
createFinancialAccount(data: CreateAccountRequest): Promise<FinancialAccountResponse>
updateFinancialAccount(id: string, data: UpdateAccountRequest): Promise<FinancialAccountResponse>
deleteFinancialAccount(id: string): Promise<void>
getMovements(id: string, page: number): Promise<Page<FinancialMovementResponse>>
registerIncome(id: string, data: IncomeRequest): Promise<FinancialMovementResponse>
```

---

## Observaciones del Arquitecto

### OBS-FIN-FE-01: `OVERDUE` es estado UI únicamente
El frontend calcula `isOverdue = dueDate < today && status === 'PENDING'` en cliente. No viene del backend. Si un usuario filtra por `OVERDUE` en la API (si existiera ese filtro), obtendría un error, ya que el enum Java no tiene ese valor.

### OBS-FIN-FE-02: Sin alertas de vencimiento próximo
No existe notificación o badge en la UI cuando una AP está próxima a vencer (ej: 3 días antes). Solo se detecta visual cuando ya está vencida.

### OBS-FIN-FE-03: Balance puede quedar negativo
El formulario de pago no valida si el saldo de la cuenta financiera seleccionada alcanza para el pago. Se puede dejar el balance en negativo sin advertencia en UI.
