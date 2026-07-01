---
tags: [historia-usuario, catalog, producto, validacion, error]
fecha: 2026-06-24
estado: implementado
---

# HU-002 — Rechazo de Producto con Nombre Duplicado

**Módulo**: Catálogo
**Épica**: Gestión del catálogo de productos
**Estado**: Implementado
**Roles habilitados**: `ADMIN`, `SUPERVISOR`

---

## Historia de usuario

### User Story HU-002:

- **Summary:** Recibir retroalimentación clara al intentar crear un producto con un nombre ya existente

#### Use Case:
- **As a** supervisor que registra productos en el catálogo
- **I want to** recibir un mensaje de error claro cuando intento guardar un producto con un nombre ya registrado
- **so that** pueda corregir el nombre sin perder los datos del formulario y sin crear registros duplicados en el catálogo

---

## Acceptance Criteria

### Scenario 1: Nombre exacto duplicado

- **Scenario:** El SUPERVISOR intenta crear un producto con un nombre idéntico al de uno existente
- **Given:** Existe un producto activo llamado "Salmón del Atlántico" en el catálogo
- **and Given:** Estoy en el Drawer de creación con el nombre "Salmón del Atlántico" ingresado
- **When:** Hago clic en "Guardar"
- **Then:** El backend retorna HTTP 409 Conflict con el mensaje `"A product with the name 'Salmón del Atlántico' already exists"`, el Drawer permanece abierto con todos los campos intactos, y el frontend muestra un toast de error rojo con ese mensaje

---

### Scenario 2: Nombre duplicado sin importar mayúsculas (case-insensitive)

- **Scenario:** La validación ignora diferencias de mayúsculas/minúsculas
- **Given:** Existe un producto activo llamado "Salmón del Atlántico"
- **and Given:** Ingreso el nombre "salmón del atlántico" (todo en minúsculas)
- **When:** Hago clic en "Guardar"
- **Then:** El backend retorna HTTP 409 — el nombre se compara sin distinción de mayúsculas

---

### Scenario 3: Nombre de producto eliminado queda disponible

- **Scenario:** Un producto eliminado (soft delete) libera su nombre
- **Given:** El producto "Merluza Fresca" fue eliminado (tiene `deleted_at` no nulo)
- **and Given:** Intento crear un nuevo producto con el nombre "Merluza Fresca"
- **When:** Hago clic en "Guardar"
- **Then:** El sistema crea el producto exitosamente — la unicidad solo aplica sobre productos activos (`deleted_at IS NULL`)

---

## Comportamiento del frontend ante el error

`DrawerFooter.handleSave()` captura la excepción y llama a:

```typescript
toast(msg, 'error')
// msg = error.response?.data?.message ?? error.message ?? 'Ocurrió un error'
```

El Drawer **no se cierra** — el SUPERVISOR puede corregir el nombre y reintentar sin reabrir el formulario.

---

## Comportamiento del backend

```java
// ProductService.java
if (productRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(request.name())) {
    throw new IllegalArgumentException(
        "A product with the name '" + request.name() + "' already exists"
    );
}
```

```java
// GlobalExceptionHandler.java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of(409, "CONFLICT", ex.getMessage()));
}
```

| Detalle | Valor |
|---|---|
| Excepción lanzada | `IllegalArgumentException` |
| HTTP status | **409 Conflict** |
| Cuerpo de respuesta | `{ status: 409, error: "CONFLICT", message: "A product with the name '...' already exists" }` |
| Scope de unicidad | Solo productos con `deleted_at IS NULL` |
| Comparación | Case-insensitive (`existsByNameIgnoreCaseAndDeletedAtIsNull`) |

---

## Ver también

- [[modules/catalog/user-stories/HU-001-crear-producto]] — Flujo principal de creación (AC-05 cubre este escenario)
- [[modules/catalog/application/ProductService]] — Lógica de validación de unicidad
