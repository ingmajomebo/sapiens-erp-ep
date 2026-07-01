---
tags: [meta, glosario, lenguaje-ubicuo]
fecha: 2026-06-21
---

# Glosario — Lenguaje Ubicuo

> En DDD, todos los miembros del equipo (negocio, desarrollo, documentación) usan exactamente estos términos. Ningún sinónimo.

---

## Términos del Dominio

### Producto
La unidad mínima del catálogo. Representa una especie o artículo que la pescadería comercializa (ej. Merluza, Camarón, Hielo). Tiene una **unidad de medida** que define cómo se cuantifica su stock.

### Unidad de Medida
Define cómo se mide un Producto. Puede ser:
- `KG` — peso en kilogramos (decimal, 3 cifras)
- `UNIDAD` — conteo entero

### Lote
Una partida específica de un Producto recibida en una fecha determinada, con un precio de compra y una fecha de vencimiento propios. Cada recepción de mercancía crea un nuevo Lote.

### Stock
La cantidad disponible de un Producto en un momento dado. **Nunca se almacena directamente** — se calcula sumando todos los Movimientos de ese Producto. Ver [[modules/inventory/business-rules]].

### Movimiento de Inventario
Registro inmutable de un cambio en el Stock. Todo ingreso o egreso de mercancía se registra como un Movimiento. Es el libro contable del inventario.

### Merma
Pérdida de producto por deterioro, rotura, vencimiento o causas externas. Genera un Movimiento de tipo `MERMA` que reduce el Stock.

### Orden de Compra
Solicitud formal a un Proveedor para adquirir productos. Al recibirse la mercancía, se generan Lotes y Movimientos de tipo `ENTRADA`.

### Venta
Transacción de salida de productos hacia un Cliente. Genera Movimientos de tipo `SALIDA`.

### POS (Punto de Venta)
Interfaz de venta rápida para operaciones en mostrador. Una Sesión POS agrupa las ventas de un turno y está ligada a una Caja.

### Sesión POS
Período de trabajo de un operador en el POS. Tiene apertura y cierre de caja con arqueo.

### Caja Registradora
Control del dinero físico en caja. Registra aperturas, cierres, entradas y salidas de efectivo.

### Gasto
Egreso de dinero no relacionado con la compra de mercancía (servicios, mantenimiento, suministros).

### Factura
Documento fiscal que formaliza una Venta o Compra.

### Arqueo de Caja
Proceso de contar el dinero físico en caja al cierre de una Sesión POS y conciliarlo con el registro del sistema.

### Proveedor
Empresa o persona que suministra Productos a la pescadería.

### Cliente
Persona o empresa que compra Productos a la pescadería.

### Rol
Conjunto de permisos asignado a un Usuario. Los roles son: `ADMIN`, `SUPERVISOR`, `OPERADOR`.

---

## Términos Técnicos del Proyecto

### Aggregate Root
Entidad que controla el acceso a su agregado. Solo se persiste y recupera a través del repositorio del aggregate root.

### Bounded Context
Límite explícito dentro del cual un modelo de dominio es consistente. En este proyecto: Catalog, Inventory, Procurement, Sales, Finance, Reports, Identity.

### ADR (Architecture Decision Record)
Documento que captura una decisión de arquitectura importante, su contexto y sus consecuencias. Ver [[decisions/_template]].

### Soft Delete
Borrado lógico: el registro se marca con `deleted_at` en lugar de eliminarse físicamente.

### FIFO (First In, First Out)
Estrategia de consumo de lotes: el lote más antiguo se agota primero.

---

## Términos a Evitar

| Evitar | Usar en su lugar |
|--------|-----------------|
| "cantidad en inventario" | **stock** |
| "mercancía" | **producto** (en el catálogo) o **lote** (al ingresar) |
| "registro de entrada" | **movimiento de tipo ENTRADA** |
| "borrar" un producto | **dar de baja** (soft delete) |
| "actualizar stock" | no existe — el stock **se calcula** |
