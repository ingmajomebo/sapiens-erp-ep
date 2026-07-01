# Procurement — Frontend

## Pantalla: PurchaseOrders (inferida)

Ruta: `/purchase-orders` (o similar)
Archivo: `frontend/src/features/procurement/` (estructura inferida a partir de `purchaseOrderApi.ts`)

### API calls

Archivo: `frontend/src/features/procurement/api/purchaseOrderApi.ts`

```typescript
// Listar OCs (con filtros opcionales)
getPurchaseOrders(params?: { status?: string; supplierId?: string }): Promise<PurchaseOrderSummary[]>

// Detalle con líneas
getPurchaseOrder(id: string): Promise<PurchaseOrderDetail>

// Crear OC
createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrderDetail>

// Confirmar OC
confirmPurchaseOrder(id: string): Promise<PurchaseOrderDetail>

// Recibir mercancía
receivePurchaseOrder(id: string, data: ReceiveRequest): Promise<PurchaseOrderDetail>

// Cancelar OC
cancelPurchaseOrder(id: string): Promise<PurchaseOrderDetail>
```

### Tipos TypeScript relevantes

```typescript
interface PurchaseOrderSummary {
  id: string;
  orderNumber: string;
  supplier: { id: string; name: string };
  status: PurchaseOrderStatus;
  expectedDelivery?: string;
  total: number;
  createdAt: string;
}

// OBSERVACIÓN: falta PARTIALLY_RECEIVED en la definición frontend
type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
// El backend también usa: 'PARTIALLY_RECEIVED'

interface CreatePurchaseOrderRequest {
  supplierId: string;
  expectedDelivery?: string;
  notes?: string;
  lines: PurchaseOrderLineRequest[];
}

interface PurchaseOrderLineRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

interface ReceiveRequest {
  notes?: string;
  lines: ReceiveLineRequest[];
}

interface ReceiveLineRequest {
  purchaseOrderLineId: string;
  receivedQuantity: number;
  expirationDate?: string;
  supplierBatchCode?: string;
}
```

### Funcionalidades esperadas en la UI

Basado en los endpoints disponibles:
- Lista de OCs con filtro por estado y proveedor
- Formulario de creación con buscador de productos por línea
- Detalle de OC con resumen financiero (subtotal, IVA, total)
- Botones de acción condicionados al estado (Confirmar, Recibir, Cancelar)
- Modal de recepción con cantidad recibida por línea, fecha de vencimiento y código de lote

---

## Observaciones del Arquitecto

### OBS-PROC-FE-01: `PARTIALLY_RECEIVED` ausente en types.ts
El tipo `PurchaseOrderStatus` en el frontend no incluye `'PARTIALLY_RECEIVED'`. Esto causa que las OCs en ese estado no tengan estilo visual ni label correcto. **Corrección requerida**: agregar `'PARTIALLY_RECEIVED'` al tipo.

### OBS-PROC-FE-02: Sin visualización de historial de recepciones
No existe pantalla para ver las recepciones previas de una OC (registros en `purchase_order_receipts`). Solo se puede ver el estado actual.
