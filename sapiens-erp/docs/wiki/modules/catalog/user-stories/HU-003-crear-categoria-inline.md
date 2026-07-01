---
tags: [historia-usuario, catalog, categoria, creacion-inline]
fecha: 2026-06-24
estado: implementado
---

# HU-003 — Crear Categoría Nueva Directamente desde el Formulario de Producto

**Módulo**: [[modules/catalog/module]]
**Épica**: Gestión del catálogo de productos
**Estado**: Implementado
**Roles habilitados**: `ADMIN`, `SUPERVISOR`

---

## Historia de usuario

### User Story HU-003:

- **Summary:** Crear una categoría nueva sin salir del formulario de creación de producto

#### Use Case:
- **As a** supervisor que registra un producto de un tipo nuevo
- **I want to** crear la categoría necesaria directamente desde el selector dentro del Drawer de producto
- **so that** puedo completar el registro del producto en un solo flujo sin tener que navegar a otra sección del sistema

---

## Acceptance Criteria

### Scenario 1: Crear categoría exitosamente desde el Drawer

- **Scenario:** SUPERVISOR crea una nueva categoría inline durante la creación de un producto
- **Given:** Estoy en el Drawer de creación de producto
- **and Given:** La categoría "Mariscos Frescos" no existe en el selector
- **When:** Hago clic en el botón "+" junto al selector de categoría, escribo "Mariscos Frescos" y hago clic en "Agregar"
- **Then:** La categoría se crea vía `POST /api/v1/categories`, queda seleccionada automáticamente en el selector de categoría, y puedo continuar completando el resto del formulario de producto

---

### Scenario 2: Nombre de categoría vacío no se acepta

- **Scenario:** El formulario inline valida que el nombre no esté vacío
- **Given:** Hice clic en "+" y aparece el input de nueva categoría
- **When:** Hago clic en "Agregar" con el campo vacío
- **Then:** El sistema muestra el error "Nombre requerido" debajo del input y no envía ninguna petición al backend

---

### Scenario 3: Tecla Enter confirma la nueva categoría

- **Scenario:** El SUPERVISOR puede crear la categoría con Enter en vez de hacer clic
- **Given:** El input de nueva categoría está visible y tiene foco automático
- **When:** Escribo el nombre de la categoría y presiono Enter
- **Then:** La categoría se crea (mismo comportamiento que hacer clic en "Agregar")

---

### Scenario 4: Error del backend al crear categoría

- **Scenario:** El backend rechaza el nombre de categoría (ej. duplicado)
- **Given:** Intento crear una categoría con un nombre ya existente
- **When:** Hago clic en "Agregar"
- **Then:** El mensaje de error del backend se muestra debajo del input de categoría; el formulario de producto permanece abierto y completo

---

### Scenario 5: Cerrar el panel inline sin crear

- **Scenario:** El SUPERVISOR cancela la creación de categoría
- **Given:** El panel inline de nueva categoría está visible
- **When:** Hago clic en el botón "×" (toggle)
- **Then:** El panel inline desaparece, el selector de categoría vuelve a su estado anterior, y no se envía ninguna petición

---

## Comportamiento UX real (Drawer.tsx)

```
1. El selector de categoría tiene un botón "+" a su derecha.
2. Al hacer clic: el botón cambia a "×" (con fondo accent) y aparece un input con autoFocus.
3. El usuario escribe el nombre y confirma (clic "Agregar" o tecla Enter).
4. Se llama a categoryApi.create(nombre.trim()).
5. Se invalida la query ['categories'] para recargar el selector.
6. La nueva categoría queda seleccionada: setCategoryId(created.id).
7. El input y el botón × desaparecen; el flujo continúa.
```

---

## API involucrada

```
POST /api/v1/categories
Authorization: Bearer <access_token>   ← SUPERVISOR o ADMIN

Body: { "name": "Mariscos Frescos" }

Respuesta exitosa: { "id": UUID, "name": "Mariscos Frescos", ... }
```

---

## Ver también

- [[modules/catalog/user-stories/HU-001-crear-producto]] — Contexto principal donde ocurre este flujo
- [[modules/catalog/entities/category]] — Entidad Category
