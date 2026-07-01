# Finance — API

## Autorización

Todos los endpoints requieren usuario autenticado. Sin restricciones adicionales de rol.

---

## Endpoints de Accounts Payable

### GET /api/v1/accounts-payable

Lista cuentas por pagar con filtros opcionales.

**Query params:**
- `status` (AccountsPayableStatus): `PENDING`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`
- `supplierId` (UUID)
- `page` / `size`

**Response 200:**
```json
{
  "content": [
    {
      "id": "...",
      "invoiceNumber": "FAC-000001",
      "supplier": { "id": "...", "name": "Distribuidora Marítima S.A." },
      "purchaseOrderNumber": "OC-1001",
      "totalAmount": 154700.00,
      "paidAmount": 0.00,
      "pendingAmount": 154700.00,
      "status": "PENDING",
      "dueDate": "2025-07-15",
      "createdAt": "2025-06-15T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

### GET /api/v1/accounts-payable/{id}

Detalle de una AP con historial de pagos.

**Response 200:**
```json
{
  "id": "...",
  "invoiceNumber": "FAC-000001",
  "supplier": { "id": "...", "name": "..." },
  "purchaseOrderNumber": "OC-1001",
  "totalAmount": 154700.00,
  "paidAmount": 50000.00,
  "pendingAmount": 104700.00,
  "status": "PARTIALLY_PAID",
  "dueDate": "2025-07-15",
  "payments": [
    {
      "id": "...",
      "amount": 50000.00,
      "paymentDate": "2025-06-20",
      "paymentMethod": "TRANSFER",
      "referenceNumber": "TRF-12345",
      "notes": null
    }
  ]
}
```

### POST /api/v1/accounts-payable/{id}/pay

Registra un pago sobre una AP.

**Request body:**
```json
{
  "amount": 50000.00,
  "paymentDate": "2025-06-20",
  "paymentMethod": "TRANSFER",
  "paymentOrigin": "Banco Santander",
  "supplierAccount": "12345678",
  "referenceNumber": "TRF-12345",
  "financialAccountId": "...",
  "notes": null
}
```

**Response 200:** `AccountsPayableResponse` actualizado
**Response 400:** monto inválido o mayor al saldo pendiente

---

## Endpoints de Financial Accounts (Caja/Banco)

### GET /api/v1/financial-accounts

Lista todas las cuentas financieras activas.

**Response 200:**
```json
[
  {
    "id": "...",
    "name": "Caja Principal",
    "accountType": "CASH",
    "balance": 250000.00,
    "currency": "CLP",
    "description": null,
    "active": true
  }
]
```

### POST /api/v1/financial-accounts

Crea una nueva cuenta.

**Request body:**
```json
{
  "name": "Cuenta Corriente Banco Estado",
  "accountType": "BANK",
  "balance": 1000000.00,
  "currency": "CLP",
  "description": "Cuenta operacional principal"
}
```

**Response 201:** `FinancialAccountResponse`

### PUT /api/v1/financial-accounts/{id}

Actualiza datos de una cuenta (nombre, descripción).

**Response 200:** `FinancialAccountResponse`

### DELETE /api/v1/financial-accounts/{id}

Desactiva (soft-delete) una cuenta financiera.

**Response 204**

### GET /api/v1/financial-accounts/{id}/movements

Historial de movimientos de una cuenta.

**Query params:** `page` / `size`

**Response 200:**
```json
{
  "content": [
    {
      "id": "...",
      "movementType": "EXPENSE",
      "amount": 50000.00,
      "balanceBefore": 300000.00,
      "balanceAfter": 250000.00,
      "description": "Pago FAC-000001 — Distribuidora Marítima S.A.",
      "createdAt": "2025-06-20T14:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3
}
```

### POST /api/v1/financial-accounts/{id}/income

Registra un ingreso manual en la cuenta.

**Request body:**
```json
{
  "amount": 100000.00,
  "description": "Depósito inicial"
}
```

**Response 201:** `FinancialMovementResponse`
