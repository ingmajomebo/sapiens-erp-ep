# Catalog — API

## Autorización

| Operación | Roles permitidos |
|-----------|-----------------|
| GET (todos los listados y detalles) | Cualquier usuario autenticado |
| POST, PUT, DELETE | `SUPERVISOR`, `ADMIN` |

Implementado con `@PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")` en cada método de escritura del controller.

---

## Endpoints de Products

### GET /api/v1/products

Lista todos los productos activos.

**Query params opcionales:**
- `name` (String) — filtro parcial case-insensitive
- `categoryId` (UUID) — filtro por categoría
- `page` (int, default 0)
- `size` (int, default 20)

**Response 200:**
```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Merluza fresca",
      "sku": "PRO-000001",
      "barcode": null,
      "category": {
        "id": "...",
        "name": "Pescados"
      },
      "unitOfMeasure": "KG",
      "minimumStock": 5.000,
      "description": "Merluza fresca del día",
      "active": true,
      "productType": "CONSUMER_GOOD",
      "purchaseCost": 2500.0000,
      "purchaseCostLast": 2600.0000,
      "averageCost": 2520.0000,
      "salePrice": 3500.0000,
      "inventoryTrackingEnabled": true,
      "status": "ACTIVE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

---

### GET /api/v1/products/{id}

Devuelve un producto por ID.

**Response 200:** mismo formato que el objeto dentro de `content` arriba.
**Response 404:** producto no encontrado o eliminado.

---

### POST /api/v1/products

Crea un nuevo producto.

**Headers:** `Authorization: Bearer <accessToken>`

**Request body:**
```json
{
  "name": "Merluza fresca",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "unitOfMeasure": "KG",
  "minimumStock": 5.0,
  "description": "Merluza fresca del día",
  "sku": null,
  "barcode": null,
  "productType": "CONSUMER_GOOD",
  "purchaseCost": 2500.00,
  "salePrice": 3500.00,
  "inventoryTrackingEnabled": true,
  "defaultWarehouse": null
}
```

**Response 201:** `ProductResponse` del producto creado.
**Response 409:** nombre o SKU ya existe.

---

### PUT /api/v1/products/{id}

Actualiza un producto existente. Mismo body que POST.

**Response 200:** `ProductResponse` actualizado.
**Response 404:** producto no encontrado.
**Response 409:** nombre o SKU en conflicto.

---

### DELETE /api/v1/products/{id}

Desactiva (soft-delete) un producto.

**Response 204:** sin cuerpo.
**Response 404:** producto no encontrado.

---

### POST /api/v1/products/bulk

Importa múltiples productos en una sola request. Los conflictos se omiten silenciosamente.

**Request body:**
```json
[
  {
    "name": "Salmón",
    "unitOfMeasure": "KG",
    "minimumStock": 3.0
  },
  {
    "name": "Atún",
    "unitOfMeasure": "KG",
    "minimumStock": 2.0
  }
]
```

**Response 201:** lista de `ProductResponse` de los productos efectivamente creados.

---

## Endpoints de Categories

### GET /api/v1/categories

Lista todas las categorías activas.

**Response 200:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Pescados",
    "description": "Pescados frescos y congelados"
  }
]
```

---

### POST /api/v1/categories

**Observación del Arquitecto**: este endpoint usa `@RequestParam` en lugar de JSON body, inconsistente con el resto de la API.

**Query params:**
- `name` (String, required)
- `description` (String, optional)

Ejemplo: `POST /api/v1/categories?name=Mariscos&description=Mariscos+frescos`

**Response 201:** `CategoryResponse` de la categoría creada.
**Response 409:** nombre ya existe.

---

### DELETE /api/v1/categories/{id}

Soft-delete de una categoría.

**Response 204:** sin cuerpo.
**Response 404:** categoría no encontrada.
