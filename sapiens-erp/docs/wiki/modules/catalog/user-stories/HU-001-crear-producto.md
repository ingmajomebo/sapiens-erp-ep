---
tags: [historia-usuario, catalog, producto, creacion]
fecha: 2026-06-24
estado: implementado
---

# HU-001 — Crear Producto

**Módulo**: Catálogo (accesible desde módulo Inventario)
**Épica**: Gestión del catálogo de productos
**Estado**: Implementado
**Roles habilitados**: `ADMIN`, `SUPERVISOR`

> ⚠️ `OPERADOR` no tiene permiso. Ver `@PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")` en `ProductController.java`.

---

## Historia de usuario

### User Story HU-001:

- **Summary:** Registrar un nuevo producto desde el módulo de inventario para que esté disponible en compras, ventas y movimientos de stock

#### Use Case:
- **As a** supervisor o administrador de la pescadería
- **I want to** registrar un nuevo producto completando el formulario del panel lateral
- **so that** el producto quede disponible en el catálogo para asignarlo a órdenes de compra, ventas y movimientos de inventario sin tener que salir de la vista actual

---

## Acceptance Criteria

### Scenario 1: Creación exitosa con datos mínimos

- **Scenario:** SUPERVISOR crea un producto con solo nombre y unidad de medida
- **Given:** Estoy autenticado como SUPERVISOR o ADMIN en el sistema
- **and Given:** Estoy en la vista de Inventario y hago clic en "+ Nuevo Producto"
- **and Given:** El Drawer lateral "Nuevo producto" se abre con el formulario vacío
- **When:** Completo únicamente el campo "Nombre del producto" (los demás quedan con sus valores por defecto) y hago clic en "Guardar"
- **Then:** El backend crea el producto y retorna HTTP 201; el Drawer muestra un estado de éxito, aparece el toast "Producto creado" en verde, y tras 900ms el Drawer se cierra y el nuevo producto aparece en la tabla de inventario con stock = 0

---

### Scenario 2: Creación exitosa con todos los campos opcionales

- **Scenario:** SUPERVISOR llena todos los campos disponibles del formulario
- **Given:** Tengo el Drawer de creación abierto
- **When:** Completo nombre, imagen (URL), SKU, código de barras, tipo de producto, precio de venta, categoría, unidad de medida, almacén predeterminado, stock mínimo, y selecciono estado "Borrador"
- **Then:** El backend crea el producto con todos los valores enviados y retorna HTTP 201 con el `ProductResponse` completo

---

### Scenario 3: Stock inicial siempre es cero

- **Scenario:** El campo "Stock actual" aparece en el formulario como solo lectura con valor 0
- **Given:** El Drawer está abierto mostrando la sección "Configuración de inventario"
- **When:** El SUPERVISOR revisa el campo "Stock actual"
- **Then:** El campo está deshabilitado (no editable) y muestra el valor "0"; una nota debajo explica que el stock no puede editarse directamente: solo cambia mediante compra, venta, merma, ajuste o traspaso

---

### Scenario 4: El costo de compra no se registra en el formulario de creación

- **Scenario:** El formulario de creación no expone un campo de costo de compra
- **Given:** Estoy en la sección "Precios" del formulario
- **When:** Busco dónde ingresar el costo de compra
- **Then:** No existe ese campo; en su lugar veo un aviso informativo: *"El costo de compra no se registra aquí — se guarda automáticamente en cada orden de compra. Puedes ver el historial de precios pagados en el detalle del producto."*

---

### Scenario 5: Estado por defecto es ACTIVE

- **Scenario:** Si no se modifica el estado, el producto se crea como Activo
- **Given:** El Drawer muestra la sección "Estado del producto" con el chip "Activo" seleccionado por defecto
- **When:** No cambio la selección y hago clic en "Guardar"
- **Then:** El producto se crea con `status = ACTIVE` y es inmediatamente visible en la tabla de inventario

---

### Scenario 6: OPERADOR recibe error 403

- **Scenario:** Un usuario con rol OPERADOR no puede crear productos
- **Given:** Estoy autenticado como OPERADOR
- **When:** Se envía `POST /api/v1/products` (directamente o desde el frontend)
- **Then:** El backend retorna HTTP 403 Forbidden con el mensaje "You do not have permission for this operation"; no se crea ningún producto

---

### Scenario 7: Nombre vacío o en blanco es rechazado

- **Scenario:** El backend rechaza la creación si el nombre está en blanco
- **Given:** El campo "Nombre del producto" está vacío o solo tiene espacios
- **When:** Se envía el formulario
- **Then:** El backend retorna HTTP 400 con error `VALIDATION_ERROR`; el Drawer permanece abierto y muestra el toast con el mensaje de validación

---

### Scenario 8: Nombre duplicado es rechazado con HTTP 409

- **Scenario:** No se pueden crear dos productos activos con el mismo nombre
- **Given:** Existe un producto activo llamado "Salmón del Atlántico" (la comparación es case-insensitive)
- **When:** Intento crear un producto con el mismo nombre
- **Then:** El backend retorna HTTP 409 Conflict con el mensaje *"A product with the name 'Salmón del Atlántico' already exists"*; el Drawer permanece abierto con los datos intactos para que pueda corregir el nombre

---

### Scenario 9: Imagen por archivo es solo vista previa local

- **Scenario:** Subir un archivo de imagen no persiste la imagen en el servidor
- **Given:** En el campo "Foto del producto" elijo la opción "seleccionar archivo (solo vista previa)"
- **When:** Selecciono una imagen desde mi equipo
- **Then:** La imagen se muestra como miniatura en el formulario pero **no se envía al servidor** al guardar; solo se persiste si ingreso una URL externa en el campo de texto

---

### Scenario 10: Cancelar el Drawer no crea ningún registro

- **Scenario:** El SUPERVISOR decide no guardar el producto
- **Given:** Tengo el Drawer abierto con campos completados
- **When:** Hago clic en "Cancelar" o en el botón "×" del encabezado
- **Then:** El Drawer se cierra sin enviar ninguna petición al backend; no se crea ningún registro

---

## Flujo completo (UX)

```
APERTURA
1. El SUPERVISOR está en la vista "Inventario / Productos".
2. Hace clic en el botón "+ Nuevo Producto".
3. Se abre el Drawer lateral (520px de ancho, desliza desde la derecha).
   - Encabezado: "Nuevo producto" + botón ×
   - Banner azul (stock info): "El stock se calcula a partir de los movimientos
     de inventario y no puede editarse directamente. Se modifica mediante:
     compra, venta, merma, ajuste o traspaso."

SECCIÓN 1 — INFORMACIÓN GENERAL
4. Nombre del producto * (obligatorio, max 100 chars)
   Placeholder: "ej. Salmón del Atlántico"
5. Foto del producto:
   - Input URL: "https://... (URL de la imagen)"
   - Alternativa: "o seleccionar archivo (solo vista previa)"
     → muestra miniatura 64×64px; el archivo NO se sube al servidor
6. SKU / Código interno + Código de barras (grid 2 columnas)
   Placeholders: "SKU-001" / "7700000000000"
7. Tipo de producto (dropdown, opcional):
   - Producto de consumo
   - Materia prima
   - Insumo de uso interno
   - Asociado a servicio

SECCIÓN 2 — PRECIOS
8. Precio de venta (número ≥ 0, opcional)
9. Banner info ℹ️: "El costo de compra no se registra aquí..."
10. Categoría fiscal (dropdown deshabilitado, "— Opcional (próximamente)")

SECCIÓN 3 — CONFIGURACIÓN DE INVENTARIO
11. Categoría (dropdown + botón "+" para crear inline — ver HU-003)
    Valor por defecto: "— Sin categoría"
12. Tipo de unidad (dropdown, obligatorio, default KG):
    KG · LB · UNIT · PACKAGE · LITER
13. Control de inventario (toggle, default: Activado)
14. Almacén predeterminado + Stock mínimo (grid 2 columnas):
    - Almacén: Cold Storage A / Cold Storage B / Almacén General
    - Stock mínimo: número ≥ 0, step 0.001
15. Stock actual (campo readonly, siempre = "0", con nota explicativa de candado)

SECCIÓN 4 — ESTADO DEL PRODUCTO
16. Chips de estado (selección única):
    [Borrador]  [Activo ✓ default]  [Inactivo]

FOOTER
17. [Cancelar]  [Guardar]

GUARDAR — FLUJO EXITOSO
18. Clic en "Guardar" → DrawerFooter.handleSave() llama a ProductForm.handleSave()
19. ProductForm.handleSave() llama a productApi.create({ ...campos })
    → POST /api/v1/products
20. Backend valida con @Valid → crea producto → retorna HTTP 201 + ProductResponse
21. React Query invalida ['products'] y ['stock'] → tabla se recarga automáticamente
22. Botón "Guardar" muestra estado de éxito (check verde)
23. Toast "Producto creado" aparece en verde
24. Tras 900ms: Drawer se cierra automáticamente

GUARDAR — FLUJO DE ERROR
18e. Si el backend retorna error → DrawerFooter captura la excepción
19e. Muestra toast en rojo con el mensaje del servidor
20e. El Drawer permanece abierto con todos los datos intactos
```

---

## Campos del formulario

| Sección | Campo UI | Campo API | Backend | Default UI | Notas |
|---|---|---|---|---|---|
| General | Nombre del producto | `name` | `@NotBlank @Size(max=100)` | — | Requerido; único case-insensitive entre activos |
| General | Foto del producto | `imageUrl` | sin validación | — | Solo URL externa persiste; archivo = preview local |
| General | SKU / Código interno | `sku` | sin validación | — | Blank enviado como `null` |
| General | Código de barras | `barcode` | sin validación | — | Blank enviado como `null` |
| General | Tipo de producto | `productType` | sin validación | — (null) | `CONSUMER_GOOD`, `RAW_MATERIAL`, `INTERNAL_SUPPLY`, `SERVICE_ASSOCIATED` |
| Precios | Precio de venta | `salePrice` | `@DecimalMin("0")` | — (null) | Número ≥ 0 |
| Precios | Categoría fiscal | — | — | Deshabilitado | No implementado aún |
| Inventario | Categoría | `categoryId` | sin validación | null | Creación inline disponible (+) |
| Inventario | Tipo de unidad | `unitOfMeasure` | `@NotNull` | `KG` | El UI siempre envía un valor; KG por defecto |
| Inventario | Control de inventario | `inventoryTrackingEnabled` | sin validación | `true` | Toggle |
| Inventario | Almacén predeterminado | `defaultWarehouse` | sin validación | null | Blank enviado como `null` |
| Inventario | Stock mínimo | `minimumStock` | `@DecimalMin("0")` | — (null) | Número ≥ 0, step 0.001 |
| Inventario | Stock actual | — | — | 0 (readonly) | Solo lectura; no se envía al servidor |
| Estado | Estado | `status` | sin validación | `ACTIVE` | `DRAFT`, `ACTIVE`, `INACTIVE` |

> **Campos que NO están en el formulario de creación:**
> - `purchaseCost` — capturado automáticamente en recepciones de compra
> - `description` — no expuesto en el formulario actual (el campo existe en el backend)
> - `purchase_cost_last`, `average_cost` — calculados automáticamente; siempre `null` al crear

---

## Validaciones del backend

| Campo | Anotación | Error si falla | HTTP |
|---|---|---|---|
| `name` | `@NotBlank @Size(max=100)` | "must not be blank" / "size must be ≤ 100" | 400 |
| `unitOfMeasure` | `@NotNull` | "must not be null" | 400 |
| `minimumStock` | `@DecimalMin("0")` | "must be ≥ 0" | 400 |
| `salePrice` | `@DecimalMin("0")` | "must be ≥ 0" | 400 |
| `purchaseCost` | `@DecimalMin("0")` | "must be ≥ 0" | 400 |
| nombre duplicado | `existsByNameIgnoreCaseAndDeletedAtIsNull` | "A product with the name '...' already exists" | **409** |

> **Cómo mapea cada excepción** (`GlobalExceptionHandler.java`):
> - `MethodArgumentNotValidException` → **HTTP 400** `VALIDATION_ERROR`
> - `IllegalArgumentException` → **HTTP 409** `CONFLICT`
> - `AccessDeniedException` → **HTTP 403** `FORBIDDEN`
> - `EntityNotFoundException` → **HTTP 404** `NOT_FOUND`

---

## Tabla de criterios de aceptación

| # | Criterio | HTTP | Resultado |
|---|---|---|---|
| AC-01 | Creación con nombre + unidad mínimos | 201 | Producto en tabla, stock = 0 |
| AC-02 | Creación con todos los campos opcionales | 201 | Todos los valores en `ProductResponse` |
| AC-03 | Nombre vacío o en blanco | 400 | Toast de error; Drawer permanece abierto |
| AC-04 | `unitOfMeasure` null (no enviado) | 400 | Toast de error; Drawer permanece abierto |
| AC-05 | Nombre duplicado (case-insensitive) | 409 | Toast con mensaje del servidor; Drawer permanece abierto |
| AC-06 | `minimumStock` negativo | 400 | Toast de error |
| AC-07 | OPERADOR intenta crear | 403 | Acceso denegado; sin creación |
| AC-08 | Estado por defecto sin seleccionar | 201 | `status = ACTIVE` |
| AC-09 | Archivo de imagen seleccionado | 201 | `imageUrl = null`; archivo no se sube |
| AC-10 | Cancelar el Drawer | — | Ninguna petición; sin registro |
| AC-11 | `purchase_cost_last` y `average_cost` al crear | 201 | Ambos `null`; se calculan al recibir primera compra |
| AC-12 | Tabla se recarga tras crear | — | Query `['products']` y `['stock']` invalidadas automáticamente |

---

## Reglas de negocio

1. **Stock inicial = 0.** Nunca se asigna stock al crear un producto; solo crece mediante movimientos de entrada.

2. **Costos automáticos.** `purchase_cost_last` y `average_cost` son `null` al crear. Se calculan con cada recepción de compra (Costo Promedio Ponderado).

3. **Unicidad del nombre.** El backend lanza `IllegalArgumentException` → HTTP **409** si ya existe un producto activo con el mismo nombre (case-insensitive). Los productos eliminados (soft delete) liberan el nombre.

4. **Blank → null.** El backend normaliza strings vacíos a `null` en `sku`, `barcode` y `defaultWarehouse` (`applyExtendedFields` en `ProductService`).

5. **UUID en el backend.** El ID del producto es un UUID generado en el backend (`Product.create()`), nunca en la BD.

6. **Soft delete.** Los productos no se eliminan físicamente. Se marcan con `deleted_at` y `active = false`; el historial de movimientos permanece intacto.

7. **`description` no expuesto.** El campo existe en backend y BD pero el formulario actual lo envía siempre como `null`.

---

## API

```
POST /api/v1/products
Authorization: Bearer <access_token>   ← Solo SUPERVISOR o ADMIN

Body (ProductRequest):
{
  "name":                     string           ← @NotBlank @Size(max=100) REQUERIDO
  "categoryId":               UUID | null
  "unitOfMeasure":            "KG"|"LB"|"UNIT"|"PACKAGE"|"LITER"  ← @NotNull REQUERIDO
  "minimumStock":             number | null    ← @DecimalMin("0")
  "description":              null             ← no expuesto en UI actual
  "sku":                      string | null
  "barcode":                  string | null
  "productType":              "CONSUMER_GOOD"|"RAW_MATERIAL"|"INTERNAL_SUPPLY"|"SERVICE_ASSOCIATED" | null
  "purchaseCost":             null             ← no expuesto en UI; se captura en compras
  "salePrice":                number | null    ← @DecimalMin("0")
  "inventoryTrackingEnabled": boolean          ← default true
  "defaultWarehouse":         string | null
  "status":                   "DRAFT"|"ACTIVE"|"INACTIVE"  ← default ACTIVE
  "imageUrl":                 string | null
}

Respuesta exitosa: HTTP 201 Created → ProductResponse
```

| HTTP | Situación |
|---|---|
| `201 Created` | Producto creado exitosamente |
| `400 Bad Request` | `@NotBlank`, `@NotNull` o `@DecimalMin` fallidos |
| `401 Unauthorized` | Token ausente o expirado |
| `403 Forbidden` | Rol sin permiso (OPERADOR u otro) |
| `409 Conflict` | Nombre ya existe en el catálogo activo |

---

## Implementación técnica

| Capa | Archivo | Qué hace |
|---|---|---|
| API | `catalog/api/ProductController.java` | `POST /api/v1/products` + `@PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")` |
| Servicio | `catalog/application/ProductService.java` | Valida unicidad de nombre; llama `Product.create()`; aplica campos opcionales |
| Dominio | `catalog/domain/Product.java` | Factory `Product.create(name, category, unit, minStock, description)` |
| DTO entrada | `catalog/api/dto/ProductRequest.java` | Record con 14 campos; `@NotBlank`, `@NotNull`, `@DecimalMin` |
| DTO salida | `catalog/api/dto/ProductResponse.java` | Incluye `purchaseCostLast`, `averageCost`, `currentStock` |
| Excepciones | `shared/api/GlobalExceptionHandler.java` | `IllegalArgumentException` → 409; `MethodArgumentNotValidException` → 400 |
| Migración | `V7__extend_product_and_purchase_order_lines.sql` | Columnas extendidas |
| Migración | `V9__add_cost_fields.sql` | `purchase_cost_last`, `average_cost` |
| Frontend API | `features/catalog/api/productApi.ts` | `productApi.create(dto)` → `POST /api/v1/products` |
| Frontend UI | `shared/Drawer.tsx` → `ProductForm` | Formulario con 4 secciones; DrawerFooter con manejo de error/éxito |
| Frontend UI | `features/inventory/Inventory.tsx` | Tabla que muestra el producto creado tras invalidar queries |

---

## Ver también

- [[modules/catalog/user-stories/HU-002-nombre-duplicado]] — Flujo de rechazo HTTP 409 por nombre existente
- [[modules/catalog/user-stories/HU-003-crear-categoria-inline]] — Crear categoría sin salir del Drawer
- [[modules/inventory/business-rules]] — Reglas de stock y movimientos
- [[modules/procurement/entities/purchase-order]] — Cómo una compra actualiza `purchase_cost_last`
