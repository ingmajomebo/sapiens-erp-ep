# SAPIENS ERP — Índice Maestro

> **Fuente única de verdad del proyecto.** Mantenido por el LLM. No editar manualmente.
> Última actualización: 2026-06-21

---

## Navegación rápida

| Necesito saber... | Ir a |
|-------------------|------|
| Qué hace este ERP | [[overview/vision]] |
| Cómo se dividen los módulos | [[overview/bounded-contexts]] |
| Reglas que aplican a todo el sistema | [[overview/cross-cutting]] |
| Qué hace un módulo específico | `modules/<modulo>/module.md` |
| Reglas de negocio de inventario | [[modules/inventory/business-rules]] |
| Cómo fluye una compra al inventario | [[architecture/integration-flows]] |
| Estructura del backend | [[architecture/backend-layers]] |
| Estructura del frontend | [[architecture/frontend-structure]] |
| Diseño de base de datos | [[architecture/database]] |
| Seguridad y autenticación | [[architecture/security]] |
| Por qué se tomó una decisión X | `decisions/adr-NNN-*.md` |
| Significado de un término del negocio | [[_meta/GLOSSARY]] |

---

## Visión General

- [[overview/vision]] — Qué es Sapiens ERP, objetivos, contexto de negocio
- [[overview/bounded-contexts]] — Mapa de contextos acotados (DDD)
- [[overview/cross-cutting]] — Reglas e invariantes transversales a todos los módulos

---

## Módulos (Bounded Contexts)

| Módulo | Responsabilidad | Archivo |
|--------|----------------|---------|
| **Catalog** | Productos, categorías, unidades de medida | [[modules/catalog/module]] |
| **Inventory** | Stock, movimientos, mermas, lotes | [[modules/inventory/module]] |
| **Procurement** | Proveedores, órdenes de compra, recepción | [[modules/procurement/module]] |
| **Sales** | Clientes, ventas, POS | [[modules/sales/module]] |
| **Finance** | Caja, gastos, facturación, contabilidad | [[modules/finance/module]] |
| **Reports** | Reportes transversales | [[modules/reports/module]] |
| **Identity** | Usuarios, roles, permisos | [[modules/identity/module]] |

### Entidades por módulo

**Catalog**
- [[modules/catalog/entities/product]] — Producto

### Historias de usuario

**Catalog**
- [[modules/catalog/user-stories/HU-001-crear-producto]] — Crear producto (flujo principal, roles SUPERVISOR/ADMIN)
- [[modules/catalog/user-stories/HU-002-nombre-duplicado]] — Rechazo por nombre duplicado (HTTP 400)
- [[modules/catalog/user-stories/HU-003-crear-categoria-inline]] — Crear categoría desde el Drawer sin salir del flujo

**Inventory**
- [[modules/inventory/entities/stock]] — Stock (calculado)
- [[modules/inventory/entities/movement]] — Movimiento de inventario
- [[modules/inventory/entities/lot]] — Lote
- [[modules/inventory/entities/waste]] — Merma

**Procurement**
- [[modules/procurement/entities/supplier]] — Proveedor
- [[modules/procurement/entities/purchase-order]] — Orden de compra

**Sales**
- [[modules/sales/entities/customer]] — Cliente
- [[modules/sales/entities/sale]] — Venta
- [[modules/sales/entities/pos-session]] — Sesión POS

**Finance**
- [[modules/finance/entities/cash-register]] — Caja registradora
- [[modules/finance/entities/expense]] — Gasto
- [[modules/finance/entities/invoice]] — Factura

**Identity**
- [[modules/identity/entities/user]] — Usuario y Rol

---

## Arquitectura

- [[architecture/overview]] — Vista de alto nivel del sistema
- [[architecture/backend-layers]] — Arquitectura en capas del backend
- [[architecture/frontend-structure]] — Estructura React/TypeScript
- [[architecture/database]] — Diseño de BD y convenciones
- [[architecture/security]] — Autenticación JWT y control de acceso
- [[architecture/integration-flows]] — Flujos de integración entre módulos

---

## Decisiones de Arquitectura (ADR)

| # | Decisión | Estado |
|---|---------|--------|
| [[decisions/adr-001-gradle-wrapper]] | Gradle Wrapper sobre Maven | Aceptado |
| [[decisions/adr-002-layered-architecture]] | Arquitectura en capas | Aceptado |
| [[decisions/adr-003-jwt-auth]] | JWT para autenticación | Aceptado |
| [[decisions/adr-004-stock-from-movements]] | Stock calculado desde movimientos | Aceptado |
| [[decisions/adr-005-soft-delete]] | Soft delete para entidades de negocio | Aceptado |

Plantilla para nuevos ADRs: [[decisions/_template]]

---

## Meta

- [[_meta/GLOSSARY]] — Lenguaje ubicuo del dominio
- [[_meta/LOG]] — Historial de cambios al wiki
- [[_meta/ROADMAP]] — Documentación pendiente
