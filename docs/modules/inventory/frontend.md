# Inventory — Frontend

## Pantalla: Inventory.tsx

Ruta: `/inventory`
Archivo: `frontend/src/features/inventory/Inventory.tsx` (~1000 líneas)

Esta pantalla concentra tanto el catálogo de productos como la gestión de inventario (movimientos, stock, lotes). No existe una pantalla separada solo para inventario.

### Funcionalidades implementadas

1. **Vista de catálogo con stock**: cada producto muestra su stock actual (obtenido del endpoint `/inventory/stock/{productId}` o incluido en el `ProductResponse`).
2. **Alertas de stock mínimo**: productos por debajo del `minimumStock` se destacan visualmente.
3. **Modal de detalle de producto** con tres tabs:
   - **Info**: campos del producto, costos (purchaseCost, averageCost, salePrice)
   - **Lotes**: tabla de lotes activos con `currentQuantity`, `unitCost`, `receivedAt`, `expirationDate`
   - **Movimientos**: historial paginado de movimientos con tipo, cantidad, costo y fecha
4. **Registrar movimiento**: botones o acciones para registrar entrada, salida, merma o ajuste desde la UI.
5. **Importación Excel**: integración con librería `xlsx` (SheetJS) para importación masiva de productos.

### API calls

Archivo: `frontend/src/features/inventory/api/inventoryApi.ts`

```typescript
// Stock actual de un producto
getStock(productId: string): Promise<StockDto>

// Lotes activos de un producto
getLots(productId: string): Promise<LotDto[]>

// Historial de movimientos
getMovements(productId: string, page: number, size: number): Promise<Page<MovementDto>>

// Registrar entrada
registerEntry(data: EntryRequest): Promise<MovementDto>

// Registrar salida
registerExit(data: ExitRequest): Promise<MovementDto>

// Registrar merma
registerWaste(data: WasteRequest): Promise<MovementDto>

// Registrar ajuste
registerAdjustment(data: AdjustmentRequest): Promise<MovementDto>
```

### Tipos TypeScript

```typescript
interface StockDto {
  productId: string;
  productName: string;
  unitOfMeasure: string;
  currentStock: number;
  minimumStock: number;
  belowMinimum: boolean;
}

interface LotDto {
  id: string;
  productId: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost?: number;
  receivedAt: string;
  expirationDate?: string;
  supplierBatchCode?: string;
}

interface MovementDto {
  id: string;
  productId: string;
  productName: string;
  movementType: MovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  previousAverageCost?: number;
  newAverageCost?: number;
  createdAt: string;
}

type MovementType = 'ENTRY' | 'EXIT' | 'WASTE' | 'POSITIVE_ADJUSTMENT' | 'NEGATIVE_ADJUSTMENT';
```

### Estado y gestión de datos

- Los lotes y movimientos se cargan bajo demanda al abrir el modal de detalle de producto.
- TanStack Query gestiona el caché de stock y movimientos.
- Al completar un movimiento exitoso, se invalida el caché del producto y su stock (`queryClient.invalidateQueries`).

---

## Observaciones del Arquitecto

### OBS-INV-FE-01: Stock cargado por separado vs en lista
En la lista de productos, el stock puede requerir N+1 llamadas (una por producto) si no está incluido en el `ProductResponse`. Verificar si el backend incluye el stock en el listado o si el frontend hace llamadas individuales.

### OBS-INV-FE-02: Sin formulario de ajuste masivo
No existe en el frontend una UI para hacer ajuste de inventario múltiple (varios productos a la vez). Solo se puede ajustar un producto por vez.

### OBS-INV-FE-03: `expirationDate` no genera alertas visuales
Aunque el campo `expirationDate` se muestra en la tabla de lotes, no hay indicador visual de lotes próximos a vencer o ya vencidos.
