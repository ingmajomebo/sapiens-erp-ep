# Catalog — Frontend

## Pantalla principal: Inventory.tsx

El catálogo de productos se gestiona dentro de la pantalla de Inventario (`frontend/src/features/inventory/Inventory.tsx`, ~1000 líneas). No existe una ruta separada solo para catálogo.

### Funcionalidades implementadas

1. **Lista de productos con agrupación por categoría**: los productos se muestran agrupados en secciones colapsables por nombre de categoría.
2. **Buscador en tiempo real**: filtra por nombre, SKU o código de barras en cliente (sin hit al servidor).
3. **CRUD de productos**: modal de creación/edición con todos los campos del `ProductRequest`.
4. **Importación desde Excel**: botón de importación masiva, lee archivo `.xlsx` con la librería `xlsx` (SheetJS), transforma las filas en `ProductRequest[]` y llama a `/products/bulk`.
5. **Modal de detalle de producto**: muestra producto con tabs:
   - **Info**: campos básicos del producto + costos
   - **Lotes**: tabla de lotes activos con stock y fecha de ingreso
   - **Movimientos**: historial de movimientos del producto

### API calls

Archivo: `frontend/src/features/inventory/api/productApi.ts`

```typescript
// Listar productos (size=200 — carga completa, sin paginación real en frontend)
getProducts(): Promise<ProductResponse[]>

// Crear producto
createProduct(data: ProductRequest): Promise<ProductResponse>

// Actualizar producto
updateProduct(id: string, data: ProductRequest): Promise<ProductResponse>

// Desactivar producto
deleteProduct(id: string): Promise<void>

// Importación masiva
importBulk(products: ProductRequest[]): Promise<ProductResponse[]>
```

```typescript
// Categorías (en categoryApi.ts)
getCategories(): Promise<CategoryResponse[]>

// Crear categoría — usa query params, no JSON body
createCategory(name: string, description?: string): Promise<CategoryResponse>
// Implementado como: POST /categories?name=...&description=...

// Eliminar categoría
deleteCategory(id: string): Promise<void>
```

### Tipos TypeScript

```typescript
interface ProductRequest {
  name: string;
  categoryId?: string;
  unitOfMeasure: UnitOfMeasure;
  minimumStock: number;
  description?: string;
  sku?: string;
  barcode?: string;
  productType?: ProductType;
  purchaseCost?: number;
  salePrice?: number;
  inventoryTrackingEnabled: boolean;
  defaultWarehouse?: string;
}

interface ProductResponse {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: CategoryResponse;
  unitOfMeasure: UnitOfMeasure;
  minimumStock: number;
  description?: string;
  active: boolean;
  productType?: ProductType;
  purchaseCost?: number;
  purchaseCostLast?: number;
  averageCost?: number;
  salePrice?: number;
  inventoryTrackingEnabled: boolean;
  status: ProductStatus;
}

type UnitOfMeasure = 'KG' | 'LB' | 'UNIT' | 'PACKAGE' | 'LITER';
type ProductType = 'CONSUMER_GOOD' | 'RAW_MATERIAL' | 'INTERNAL_SUPPLY' | 'SERVICE_ASSOCIATED';
type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
```

### Estado y gestión de datos

- **TanStack Query**: los productos se cachean con `queryKey: ['products']`. El catálogo se carga una sola vez con `size=200` (se asume que el catálogo no supera 200 productos).
- **Filtrado local**: la búsqueda y agrupación por categoría se realizan en cliente sobre el array cacheado.
- **Zustand**: no se usa store global para productos; todo el estado de UI (modales abiertos, producto seleccionado) es local con `useState`.

---

## Observaciones del Arquitecto

### OBS-CAT-FE-01: Paginación falsa
`getProducts()` llama con `size=200`. Si el catálogo crece más de 200 productos, los excedentes no se muestran. Se debería implementar paginación real o búsqueda lazy.

### OBS-CAT-FE-02: `imageUrl` no se muestra
El campo `imageUrl` existe en BD y en el DTO de respuesta, pero la UI no muestra imágenes de productos en ningún lugar. La funcionalidad está pendiente.

### OBS-CAT-FE-03: Categorías mezcladas con Inventario
No existe una ruta `/catalog` en el frontend. Las categorías y productos se gestionan desde `/inventory`. Si en el futuro se separan las responsabilidades, esto requerirá refactoring de rutas.
