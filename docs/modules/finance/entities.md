# Finance — Entidades

## AccountsPayable

Tabla: `accounts_payable`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `purchaseOrder` | `PurchaseOrder` | `purchase_order_id UUID FK` | NOT NULL |
| `receipt` | `PurchaseReceipt` | `receipt_id UUID FK` | nullable (V11) |
| `supplier` | `Supplier` | `supplier_id UUID FK` | NOT NULL |
| `invoiceNumber` | `String` | `invoice_number VARCHAR(20)` | NOT NULL, UNIQUE |
| `totalAmount` | `BigDecimal` | `total_amount NUMERIC(14,4)` | NOT NULL |
| `paidAmount` | `BigDecimal` | `paid_amount NUMERIC(14,4)` | NOT NULL, DEFAULT 0 |
| `status` | `AccountsPayableStatus` | `status VARCHAR(20)` | NOT NULL, DEFAULT 'PENDING' |
| `dueDate` | `LocalDate` | `due_date DATE` | NOT NULL |
| `notes` | `String` | `notes TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio:**
- `pendingAmount()` → `totalAmount - paidAmount`
- `registerPayment(amount)` → incrementa `paidAmount`; si `paidAmount >= totalAmount`, cambia status a `PAID`, si no, a `PARTIALLY_PAID`

---

## SupplierPayment

Tabla: `supplier_payments`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `accountsPayable` | `AccountsPayable` | `accounts_payable_id UUID FK` | NOT NULL |
| `amount` | `BigDecimal` | `amount NUMERIC(14,4)` | NOT NULL |
| `paymentDate` | `LocalDate` | `payment_date DATE` | NOT NULL |
| `paymentMethod` | `String` | `payment_method VARCHAR(50)` | nullable |
| `paymentOrigin` | `String` | `payment_origin VARCHAR(100)` | nullable (V12) |
| `supplierAccount` | `String` | `supplier_account VARCHAR(100)` | nullable (V12) |
| `referenceNumber` | `String` | `reference_number VARCHAR(100)` | nullable (V12) |
| `financialAccount` | `FinancialAccount` | `financial_account_id UUID FK` | nullable (V13) |
| `notes` | `String` | `notes TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |

---

## FinancialAccount

Tabla: `financial_accounts`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `name` | `String` | `name VARCHAR(100)` | NOT NULL |
| `accountType` | `AccountType` | `account_type VARCHAR(20)` | NOT NULL |
| `balance` | `BigDecimal` | `balance NUMERIC(14,4)` | NOT NULL, DEFAULT 0 |
| `currency` | `String` | `currency VARCHAR(3)` | NOT NULL, DEFAULT 'CLP' |
| `description` | `String` | `description TEXT` | nullable |
| `active` | `boolean` | `active BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio:**
- `applyExpense(amount)` → `balance -= amount`
- `applyIncome(amount)` → `balance += amount`

---

## FinancialMovement

Tabla: `financial_movements`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `financialAccount` | `FinancialAccount` | `financial_account_id UUID FK` | NOT NULL |
| `movementType` | `FinancialMovementType` | `movement_type VARCHAR(20)` | NOT NULL |
| `amount` | `BigDecimal` | `amount NUMERIC(14,4)` | NOT NULL |
| `balanceBefore` | `BigDecimal` | `balance_before NUMERIC(14,4)` | NOT NULL — snapshot antes |
| `balanceAfter` | `BigDecimal` | `balance_after NUMERIC(14,4)` | NOT NULL — snapshot después |
| `description` | `String` | `description TEXT` | nullable |
| `referenceId` | `UUID` | `reference_id UUID` | nullable — FK genérica |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | NOT NULL |

**Método de fábrica:**
- `FinancialMovement.createExpense(account, amount, description, referenceId)` → captura `balanceBefore`, llama `account.applyExpense()`, captura `balanceAfter`

---

## Enums

### AccountsPayableStatus

```java
public enum AccountsPayableStatus { PENDING, PARTIALLY_PAID, PAID, CANCELLED }
```

**Observación**: El frontend muestra y filtra por `OVERDUE`, pero este estado no existe en el enum Java ni en el CHECK de BD. Ver OBS-FIN-01.

### AccountType

```java
public enum AccountType { CASH, BANK, CREDIT }
```

### FinancialMovementType

```java
public enum FinancialMovementType { INCOME, EXPENSE }
```

---

## Observaciones del Arquitecto

### OBS-FIN-ENT-01: `OVERDUE` no existe como status persistido
La BD solo permite `PENDING|PARTIALLY_PAID|PAID|CANCELLED`. El frontend muestra `OVERDUE` como un estado visual calculado (dueDate < hoy && status = PENDING), pero no existe como valor en BD ni en el enum Java. Si se consulta con filtro `status=OVERDUE` en la API, podría fallar.
