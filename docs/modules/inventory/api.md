# Inventory — API

## Autorización

Todos los endpoints requieren usuario autenticado. No hay restricción de rol adicional (cualquier rol puede registrar movimientos).

---

## Endpoints

### GET /api/v1/inventory/stock/{productId}

Retorna el stock actual calculado del producto.

**Response 200:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "productName": "Merluza fresca",
  "unitOfMeasure": "KG",
  "currentStock": 47.500,
  "minimumStock": 5.000,
  "belowMinimum": false
}
```

---

### GET /api/v1/inventory/lots/{productId}

Lista todos los lotes activos (con `currentQuantity > 0`) de un producto.

**Response 200:**
```json
[
  {
    "id": "...",
    "productId": "...",
    "initialQuantity": 50.000,
    "currentQuantity": 47.500,
    "unitCost": 2600.0000,
    "receivedAt": "2025-06-01T10:00:00Z",
    "expirationDate": "2025-06-10",
    "supplierBatchCode": "LOTE-2025-001"
  }
]
```

---

### GET /api/v1/inventory/movements/{productId}

Historial de movimientos de un producto.

**Query params:**
- `page` (int, default 0)
- `size` (int, default 20)

**Response 200:**
```json
{
  "content": [
    {
      "id": "...",
      "productId": "...",
      "productName": "Merluza fresca",
      "movementType": "ENTRY",
      "quantity": 50.000,
      "unitCost": 2600.0000,
      "totalCost": 130000.0000,
      "reason": null,
      "previousAverageCost": 2500.0000,
      "newAverageCost": 2502.0000,
      "createdAt": "2025-06-01T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 5
}
```

---

### POST /api/v1/inventory/entry

Registra una entrada de stock.

**Request body:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 50.0,
  "unitCost": 2600.00,
  "expirationDate": "2025-06-10",
  "supplierBatchCode": "LOTE-2025-001"
}
```

**Response 201:** `MovementResponse`

---

### POST /api/v1/inventory/exit

Registra una salida de stock (consume lotes FIFO).

**Request body:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 5.0,
  "reason": "Venta mostrador"
}
```

**Response 201:** `MovementResponse`
**Response 422:** stock insuficiente

---

### POST /api/v1/inventory/waste

Registra una merma (reason obligatorio).

**Request body:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 2.0,
  "reason": "Producto vencido"
}
```

**Response 201:** `MovementResponse`
**Response 400:** reason vacío
**Response 422:** stock insuficiente

---

### POST /api/v1/inventory/adjustment

Registra un ajuste de inventario (positivo o negativo).

**Request body:**
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 3.0,
  "adjustmentType": "POSITIVE_ADJUSTMENT",
  "reason": "Recuento físico — diferencia encontrada",
  "unitCost": 2500.00
}
```

**Response 201:** `MovementResponse`
**Response 400:** reason vacío en ajuste negativo
**Response 422:** stock insuficiente en ajuste negativo
