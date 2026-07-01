# Procurement — API

## Autorización

Todos los endpoints requieren usuario autenticado. No hay restricciones de rol adicionales especificadas en el código.

---

## Endpoints de Suppliers

### GET /api/v1/suppliers

Lista todos los proveedores activos.

**Response 200:**
```json
[
  {
    "id": "...",
    "name": "Distribuidora Marítima S.A.",
    "taxId": "12345678-9",
    "contactName": "Juan Pérez",
    "phone": "+56 9 1234 5678",
    "email": "juan@maritima.cl",
    "address": "Av. Puerto 123, Valparaíso",
    "notes": null
  }
]
```

### POST /api/v1/suppliers

**Request body:**
```json
{
  "name": "Distribuidora Marítima S.A.",
  "taxId": "12345678-9",
  "contactName": "Juan Pérez",
  "phone": "+56 9 1234 5678",
  "email": "juan@maritima.cl",
  "address": "Av. Puerto 123, Valparaíso",
  "notes": null
}
```

**Response 201:** `SupplierResponse`

### PUT /api/v1/suppliers/{id}

Actualiza un proveedor. Body igual a POST.

**Response 200:** `SupplierResponse`

### DELETE /api/v1/suppliers/{id}

Soft-delete de proveedor.

**Response 204**

---

## Endpoints de Purchase Orders

### GET /api/v1/purchase-orders

Lista OCs con filtros opcionales.

**Query params:**
- `status` (PurchaseOrderStatus)
- `supplierId` (UUID)
- `page` / `size`

**Response 200:**
```json
{
  "content": [
    {
      "id": "...",
      "orderNumber": "OC-1001",
      "supplier": { "id": "...", "name": "Distribuidora Marítima S.A." },
      "status": "DRAFT",
      "expectedDelivery": "2025-06-15",
      "subtotal": 130000.00,
      "totalTax": 24700.00,
      "total": 154700.00,
      "createdAt": "2025-06-01T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3
}
```

### GET /api/v1/purchase-orders/{id}

Detalle completo de una OC con sus líneas.

**Response 200:**
```json
{
  "id": "...",
  "orderNumber": "OC-1001",
  "supplier": { "id": "...", "name": "..." },
  "status": "CONFIRMED",
  "expectedDelivery": "2025-06-15",
  "notes": "Urgente",
  "lines": [
    {
      "id": "...",
      "product": { "id": "...", "name": "Merluza fresca", "unitOfMeasure": "KG" },
      "quantity": 50.000,
      "unitPrice": 2600.0000,
      "discount": 0.00,
      "taxRate": 19.00,
      "receivedQuantity": 0.000
    }
  ],
  "subtotal": 130000.00,
  "totalTax": 24700.00,
  "total": 154700.00
}
```

### POST /api/v1/purchase-orders

**Request body:**
```json
{
  "supplierId": "...",
  "expectedDelivery": "2025-06-15",
  "notes": "Urgente",
  "lines": [
    {
      "productId": "...",
      "quantity": 50.0,
      "unitPrice": 2600.00,
      "discount": 0,
      "taxRate": 19
    }
  ]
}
```

**Response 201:** `PurchaseOrderResponse` completo

### PUT /api/v1/purchase-orders/{id}/confirm

Confirma una OC en estado DRAFT.

**Response 200:** `PurchaseOrderResponse` con status=CONFIRMED

### POST /api/v1/purchase-orders/{id}/receive

Registra una recepción de mercancía.

**Request body:**
```json
{
  "notes": "Recepción completa",
  "lines": [
    {
      "purchaseOrderLineId": "...",
      "receivedQuantity": 50.0,
      "expirationDate": "2025-06-20",
      "supplierBatchCode": "LOTE-001"
    }
  ]
}
```

**Response 200:** `PurchaseOrderResponse` con status actualizado

### PUT /api/v1/purchase-orders/{id}/cancel

Cancela una OC en estado DRAFT o CONFIRMED.

**Response 200:** `PurchaseOrderResponse` con status=CANCELLED
