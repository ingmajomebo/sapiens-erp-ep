---
tags: [meta, roadmap]
fecha: 2026-06-21
---

# Roadmap de Documentación

> Seguimiento de qué documentación existe, está en progreso o falta.
> Estado: `✅ Completo` | `🔄 En progreso` | `📋 Pendiente` | `❌ Bloqueado`

---

## Meta & Visión

| Documento | Estado | Notas |
|-----------|--------|-------|
| INDEX.md | ✅ Completo | |
| GLOSSARY.md | ✅ Completo | Expandir con términos financieros |
| LOG.md | ✅ Completo | |
| ROADMAP.md | ✅ Completo | Este archivo |
| overview/vision.md | ✅ Completo | |
| overview/bounded-contexts.md | ✅ Completo | Agregar diagrama Mermaid cuando el proyecto madure |
| overview/cross-cutting.md | ✅ Completo | |

---

## Módulos

| Módulo | module.md | business-rules.md | entities/ | api/ |
|--------|-----------|-------------------|-----------|------|
| Catalog | ✅ | 📋 | ✅ product | 📋 |
| Inventory | ✅ | ✅ | ✅ stock, movement, lot, waste | 📋 |
| Procurement | ✅ | ✅ | ✅ supplier, purchase-order | 📋 |
| Sales | ✅ | ✅ | ✅ customer, sale, pos-session | 📋 |
| Finance | ✅ | ✅ | ✅ cash-register, expense, invoice | 📋 |
| Reports | ✅ | 📋 | 📋 | — |
| Identity | ✅ | 📋 | ✅ user | 📋 |

---

## Arquitectura

| Documento | Estado | Notas |
|-----------|--------|-------|
| architecture/overview.md | ✅ Completo | |
| architecture/backend-layers.md | ✅ Completo | |
| architecture/frontend-structure.md | ✅ Completo | UI prototype implementado en `frontend/` |
| architecture/database.md | ✅ Completo | Agregar diagrama ER completo cuando existan migraciones |
| architecture/security.md | ✅ Completo | |
| architecture/integration-flows.md | ✅ Completo | |

---

## Decisiones (ADRs)

| ADR | Estado | Notas |
|-----|--------|-------|
| adr-001-gradle-wrapper | ✅ | |
| adr-002-layered-architecture | ✅ | |
| adr-003-jwt-auth | ✅ | |
| adr-004-stock-from-movements | ✅ | |
| adr-005-soft-delete | ✅ | |
| adr-006-fifo-lot-strategy | 📋 | Documentar cuando se implemente |
| adr-007-decimal-stock-precision | 📋 | Documentar cuando se defina precisión |

---

## Próximas tareas de documentación

0. **Backend** — Crear proyecto Spring Boot en `backend/`. El frontend está listo para conectarse vía `api/client.ts` (Axios + JWT interceptor a `/api/v1`)
1. **Contratos API por módulo** — Crear `api/endpoints.md` para cada módulo cuando se implementen los controllers
2. **Diagrama ER** — Agregar diagrama completo en `architecture/database.md` tras primeras migraciones Flyway
3. **Diagrama de contextos** — Agregar Mermaid en `overview/bounded-contexts.md`
4. **business-rules.md** para Catalog, Reports e Identity
5. **ADR-006** — Estrategia FIFO para consumo de lotes
6. **Runbooks** — Crear `_meta/runbooks/` con procedimientos operacionales cuando se llegue a producción

---

## Convención de templates

Cada tipo de documento tiene su template canónico:

| Tipo | Template de referencia |
|------|----------------------|
| ADR | [[decisions/_template]] |
| Módulo | [[modules/catalog/module]] (usar como base) |
| Entidad | [[modules/catalog/entities/product]] (usar como base) |
| Reglas de negocio | [[modules/inventory/business-rules]] (usar como base) |
