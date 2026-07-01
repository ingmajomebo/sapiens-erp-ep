# API REST — Visión General

## Base URL

```
http://localhost:8080/api/v1/
```

## Convenciones

- Todos los endpoints (excepto `/auth/**` y `/actuator/health`) requieren `Authorization: Bearer <token>`
- Paginación: `{ content, number, size, totalElements, totalPages }`
- Errores: `{ status, error, message, timestamp }`
- PKs: UUID en todos los recursos
- Timestamps: ISO-8601 con zona UTC

## Tabla completa de endpoints

### Identity (sin autenticación requerida)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/v1/auth/login` | Autenticación con email/password | Público |
| POST | `/api/v1/auth/refresh` | Renovar access token con refresh token | Público |
| POST | `/api/v1/auth/logout` | Revocar refresh token | Público |

### Catalog

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/products` | Listar productos (paginado, default size=20, sort=name) | Todos |
| GET | `/api/v1/products/{id}` | Obtener producto por ID | Todos |
| POST | `/api/v1/products` | Crear producto | SUPERVISOR, ADMIN |
| PUT | `/api/v1/products/{id}` | Actualizar producto | SUPERVISOR, ADMIN |
| DELETE | `/api/v1/products/{id}` | Soft-delete producto | SUPERVISOR, ADMIN |
| POST | `/api/v1/products/import` | Importar productos en lote | SUPERVISOR, ADMIN |
| GET | `/api/v1/categories` | Listar categorías activas | Todos |
| POST | `/api/v1/categories` | Crear categoría | SUPERVISOR, ADMIN |

### Inventory

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/inventory/stock` | Listar stock de todos los productos (paginado, default size=50) | Todos |
| GET | `/api/v1/inventory/stock/{productId}` | Stock de un producto | Todos |
| GET | `/api/v1/inventory/lots/{productId}` | Lotes de un producto | Todos |
| GET | `/api/v1/inventory/lots/expiring?days=3` | Lotes próximos a vencer | Todos |
| GET | `/api/v1/inventory/movements?productId=` | Movimientos (paginado, default size=30) | Todos |
| POST | `/api/v1/inventory/entries` | Registrar entrada de stock | OPERATOR, SUPERVISOR, ADMIN |
| POST | `/api/v1/inventory/exits` | Registrar salida de stock | OPERATOR, SUPERVISOR, ADMIN |
| POST | `/api/v1/inventory/wastes` | Registrar merma | SUPERVISOR, ADMIN |
| POST | `/api/v1/inventory/adjustments` | Ajuste positivo/negativo | SUPERVISOR, ADMIN |

### Procurement

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/suppliers` | Listar proveedores | Todos |
| GET | `/api/v1/suppliers/{id}` | Obtener proveedor | Todos |
| POST | `/api/v1/suppliers` | Crear proveedor | SUPERVISOR, ADMIN |
| PUT | `/api/v1/suppliers/{id}` | Actualizar proveedor | SUPERVISOR, ADMIN |
| DELETE | `/api/v1/suppliers/{id}` | Soft-delete proveedor | SUPERVISOR, ADMIN |
| GET | `/api/v1/purchase-orders` | Listar OCs activas | Todos |
| GET | `/api/v1/purchase-orders/{id}` | Obtener OC con líneas | Todos |
| GET | `/api/v1/purchase-orders/{id}/receipt` | Obtener recepción de OC | Todos |
| POST | `/api/v1/purchase-orders` | Crear OC | SUPERVISOR, ADMIN |
| POST | `/api/v1/purchase-orders/{id}/confirm` | Confirmar OC (DRAFT → CONFIRMED) | SUPERVISOR, ADMIN |
| POST | `/api/v1/purchase-orders/{id}/receive` | Recibir OC (crea receipt + inventory entries + AP) | SUPERVISOR, ADMIN |
| DELETE | `/api/v1/purchase-orders/{id}` | Soft-delete OC (solo DRAFT o CONFIRMED) | SUPERVISOR, ADMIN |

### Finance

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/accounts-payable` | Listar todas las cuentas por pagar | Todos |
| GET | `/api/v1/accounts-payable/pending` | Listar solo pendientes | Todos |
| GET | `/api/v1/accounts-payable/by-purchase-order/{poId}` | Factura por ID de OC | Todos |
| GET | `/api/v1/accounts-payable/{id}/payments` | Historial de pagos | Todos |
| POST | `/api/v1/accounts-payable/{id}/pay` | Registrar pago | SUPERVISOR, ADMIN |
| GET | `/api/v1/financial-accounts` | Listar cuentas financieras | Todos |
| POST | `/api/v1/financial-accounts` | Crear cuenta financiera | SUPERVISOR, ADMIN |
| GET | `/api/v1/financial-accounts/{id}/movements` | Movimientos de una cuenta | Todos |

### Project

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/sprints` | Listar sprints | Todos (autenticados) |
| POST | `/api/v1/sprints` | Crear sprint | Todos (autenticados) |
| POST | `/api/v1/sprints/{id}/activate` | Activar sprint | Todos (autenticados) |
| POST | `/api/v1/sprints/{id}/complete` | Completar sprint | Todos (autenticados) |
| DELETE | `/api/v1/sprints/{id}` | Soft-delete sprint | Todos (autenticados) |
| GET | `/api/v1/project-tasks?sprintId=&assignee=&status=` | Listar tareas filtradas | Todos (autenticados) |
| POST | `/api/v1/project-tasks` | Crear tarea | Todos (autenticados) |
| PUT | `/api/v1/project-tasks/{id}` | Actualizar tarea | Todos (autenticados) |
| PATCH | `/api/v1/project-tasks/{id}/status` | Actualizar status de tarea | Todos (autenticados) |
| PATCH | `/api/v1/project-tasks/{id}/hours` | Registrar horas reales | Todos (autenticados) |
| DELETE | `/api/v1/project-tasks/{id}` | Soft-delete tarea | Todos (autenticados) |
| GET | `/api/v1/prompt-plans` | Listar prompt plans | Todos (autenticados) |
| POST | `/api/v1/prompt-plans` | Crear prompt plan | Todos (autenticados) |
| PUT | `/api/v1/prompt-plans/{id}` | Actualizar prompt plan | Todos (autenticados) |
| PATCH | `/api/v1/prompt-plans/{id}/status?status=` | Actualizar status de prompt | Todos (autenticados) |
| DELETE | `/api/v1/prompt-plans/{id}` | Soft-delete prompt plan | Todos (autenticados) |
| GET | `/api/v1/user-stories?storyType=&module=&status=` | Listar historias filtradas | Todos (autenticados) |
| POST | `/api/v1/user-stories` | Crear historia | Todos (autenticados) |
| PUT | `/api/v1/user-stories/{id}` | Actualizar historia | Todos (autenticados) |
| PATCH | `/api/v1/user-stories/{id}/status?status=` | Actualizar status de historia | Todos (autenticados) |
| DELETE | `/api/v1/user-stories/{id}` | Soft-delete historia | Todos (autenticados) |
| POST | `/api/v1/user-stories/{storyId}/scenarios` | Agregar escenario Gherkin | Todos (autenticados) |
| PUT | `/api/v1/user-stories/scenarios/{scenarioId}` | Actualizar escenario | Todos (autenticados) |
| DELETE | `/api/v1/user-stories/scenarios/{scenarioId}` | Eliminar escenario | Todos (autenticados) |

### AI

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/v1/ai/generate-prompt` | Generar prompt usando Anthropic API | Todos (autenticados) |

### Actuator

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/actuator/health` | Health check | Público |

## Ejemplos de peticiones clave

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@sapiens.com",
  "password": "Admin1234!"
}
```

Respuesta:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "abc123...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Administrator",
  "role": "ADMIN"
}
```

### Crear producto
```http
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Salmón fresco",
  "categoryId": "uuid-categoria",
  "unitOfMeasure": "KG",
  "productType": "CONSUMER_GOOD",
  "salePrice": 45000.00,
  "defaultWarehouse": "Bodega principal",
  "minimumStock": 5.0,
  "purchaseCost": 38000.00
}
```

### Registrar entrada de inventario
```http
POST /api/v1/inventory/entries
Authorization: Bearer <token>

{
  "productId": "uuid-producto",
  "quantity": 50.0,
  "purchasePrice": 38000.00,
  "receivedAt": "2026-06-28",
  "invoiceNumber": "FAC-001",
  "notes": "Lote fresco de proveedora"
}
```

### Registrar pago a proveedor
```http
POST /api/v1/accounts-payable/{id}/pay
Authorization: Bearer <token>

{
  "amount": 500000.00,
  "paymentDate": "2026-06-28",
  "paymentMethod": "Transferencia",
  "financialAccountId": "uuid-cuenta-financiera",
  "referenceNumber": "TRF-20260628-001"
}
```
