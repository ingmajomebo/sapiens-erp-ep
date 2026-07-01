# Convenciones de Código — Sapiens ERP

## Idioma en identificadores

Todos los identificadores de código están en **inglés**:
- Nombres de clases, campos Java, métodos
- Columnas SQL, tablas, índices
- Enums, DTOs, nombres de variables
- Rutas de endpoints REST

La documentación, comentarios y el lenguaje ubicuo del negocio permanecen en **español**.

## Java — Backend

### Estructura de paquetes

```
com.sapiens.erp.modules.<modulo>
    .api/                 ← Controllers + DTOs (records)
        .dto/
            <Entity>Request.java    ← Input con validaciones Bean Validation
            <Entity>Response.java   ← Output como record con static from(Entity)
    .application/         ← Services con @Transactional
    .domain/              ← Entidades JPA + Enums + Repositorios + Excepciones
        .exception/
    .infrastructure/      ← Configuraciones, filtros, inicializadores

com.sapiens.erp.shared
    .api/                 ← GlobalExceptionHandler, ErrorResponse
    .domain/              ← AuditableEntity
```

### Convenciones de nombres

| Tipo | Sufijo / Prefijo | Ejemplo |
|------|-----------------|---------|
| Service | `Service` | `ProductService`, `InventoryService` |
| Repository | `Repository` | `ProductRepository`, `LotRepository` |
| DTO de entrada | `Request` | `ProductRequest`, `EntryRequest` |
| DTO de salida | `Response` | `ProductResponse`, `MovementResponse` |
| Excepción de dominio | `Exception` | `InsufficientStockException`, `ProductNotFoundException` |
| Enum | Sin sufijo, PascalCase | `MovementType`, `Role`, `ProductStatus` |
| Entidad JPA | Sin sufijo | `Product`, `Lot`, `PurchaseOrder` |

### Reglas de `@Transactional`

- **Solo en `application/`**: nunca en controllers ni repositorios
- `readOnly = true` en todos los métodos de consulta
- Los métodos de escritura usan la transacción default (REQUIRED)

### Entidades JPA

- Extienden `AuditableEntity` (que provee `createdAt`, `updatedAt`, `deletedAt`)
- PKs son UUID generados en la app (`UUID.randomUUID()`)
- Tienen un factory method estático `create(...)` — nunca constructores con argumentos para instanciación
- El `@NoArgsConstructor` es para JPA exclusivamente
- Los setters se generan con Lombok `@Setter` solo cuando la entidad necesita mutarse
- Las entidades inmutables usan solo `@Getter`

### DTOs

- Todos son `record` de Java
- Los `Response` tienen un método `from(Entity entity)` estático
- Los `Request` tienen anotaciones de validación (`@NotBlank`, `@NotNull`, `@DecimalMin`, etc.)
- Las entidades JPA nunca salen del backend — siempre se mapean a Response antes de retornar

### Controllers

- Solo delegan al Service, sin lógica de negocio
- Retornan `ResponseEntity<T>` con código HTTP correcto
- Usan `@PreAuthorize` para autorización por método cuando aplica
- Usan `@Valid` en `@RequestBody` y parámetros

### Logging

- **Usar SLF4J siempre** via `@Slf4j` de Lombok
- **Nunca `System.out.println`**

## SQL / Flyway

- Cada cambio de esquema **requiere una migración Flyway** con número secuencial
- **Nunca modificar migraciones ya ejecutadas**
- Convención de nombre: `V{n}__{descripcion_con_underscores}.sql`
- Los campos de auditoría obligatorios en tablas de entidad: `created_at`, `updated_at`, `deleted_at`
- PKs siempre UUID (`id UUID PRIMARY KEY`)
- Soft delete: columna `deleted_at TIMESTAMPTZ` — nunca `DELETE` físico en datos de negocio
- Los timestamps usan `TIMESTAMPTZ`, no `TIMESTAMP` (V3 migró los existentes)

## TypeScript / React — Frontend

### Estructura de features

```
src/features/<modulo>/
    api/
        <entity>Api.ts      ← Funciones de llamada HTTP usando client.ts
    <ModulePage>.tsx        ← Componente principal de la página
```

### Convenciones de nombres TS/React

| Tipo | Convención |
|------|-----------|
| Componentes React | PascalCase, extensión `.tsx` |
| Hooks | prefijo `use`, extensión `.ts` |
| API modules | sufijo `Api`, ej: `productApi`, `inventoryApi` |
| Tipos de DTO | sufijo `Dto`, ej: `ProductDto`, `StockDto` |
| Tipos de Request | sufijo `Dto` o `Request`, ej: `CreateProductDto` |
| Stores Zustand | prefijo `use`, ej: `useAuthStore`, `useAppStore` |

### Manejo de estado

- **Zustand** para estado global (auth, UI, preferencias)
- **TanStack Query** para estado del servidor (cache, invalidación)
- No usar `useState` para datos del servidor — usar `useQuery`

### HTTP Client

- Un único cliente Axios en `src/api/client.ts`
- Interceptor de request: adjunta `Bearer token` desde localStorage
- Interceptor de response: en 401, intenta refresh token automáticamente; si falla, limpia sesión
- Las features usan siempre `client.ts`, nunca crean instancias Axios propias (excepción: `authApi.ts` usa una instancia separada para evitar recursión en el refresh)

### Reglas de TypeScript

- **No usar `any`** sin justificación explícita en comentario
- Los tipos de DTOs deben estar alineados con el contrato REST del backend
- Las enumeraciones del backend se replican como `type` de TypeScript (no `enum`)

## Manejo de errores

### Backend

- El `GlobalExceptionHandler` centraliza todas las respuestas de error
- Las excepciones de dominio van en `domain/exception/`
- Los servicios lanzan excepciones de dominio o `IllegalArgumentException` / `IllegalStateException`
- El handler mapea: 400 validación, 404 no encontrado, 409 conflicto (duplicados), 422 reglas de negocio

### Frontend

- Errores de API se capturan en los handlers de `useMutation` (`onError`)
- Se muestran con `toast()` (sistema de notificaciones propio en `src/shared/toast.ts`)
- Los errores de red (sin respuesta) muestran mensajes genéricos

## Arquitectura de dominio

### Stock calculado por movimientos (ADR-004)

El stock actual **no se almacena como campo** — se calcula sumando movimientos:

```sql
-- Lógica implementada en InventoryMovementRepository
SELECT SUM(CASE WHEN movement_type IN ('ENTRY','POSITIVE_ADJUSTMENT') THEN quantity ELSE -quantity END)
FROM inventory_movements
WHERE product_id = ?
```

No existe `product.setStockActual()` ni `UPDATE products SET stock = ...`.

### FIFO para lotes

Cuando se registra una salida, los lotes se consumen en orden de `received_at` ascendente (más antiguo primero). Implementado en `InventoryService.consumeFIFO()`.

### Costo promedio ponderado

Se recalcula en cada entrada:
```
nuevo_costo_promedio = (stock_actual × costo_promedio_actual + cantidad_nueva × costo_nuevo) / (stock_actual + cantidad_nueva)
```

Implementado en `Product.applyEntryAndRecalculateCost()`.
