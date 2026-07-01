---
tags: [arquitectura, overview]
fecha: 2026-06-21
---

# Arquitectura — Vista General

## Diagrama de sistema

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                    │
│              React 18 + TypeScript + Vite               │
│         features/ por bounded context (DDD)             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + JWT
                         ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Spring Boot 3.x / Java 21)        │
│                                                         │
│  api/          → Controllers REST (DTOs)                │
│  application/  → Servicios y casos de uso               │
│  domain/       → Entidades, Value Objects, Excepciones  │
│  infrastructure→ Repositorios JPA, Config, Adapters     │
│                                                         │
│  Módulos: catalog | inventory | procurement | sales     │
│           finance | reports | identity                  │
└────────────────────────┬────────────────────────────────┘
                         │ JDBC / JPA
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL 16                              │
│         Migraciones gestionadas con Flyway              │
└─────────────────────────────────────────────────────────┘
```

## Principios que guían la arquitectura

1. **Modular por Bounded Context** — cada módulo es autocontenido: sus entidades, servicios y repositorios no dependen de los de otro módulo (se usan IDs, no objetos)
2. **Capas con dependencia unidireccional** — `api → application → domain ← infrastructure`
3. **Stock calculado, no almacenado** — el inventario es el resultado de sus movimientos
4. **Inmutabilidad de registros de auditoría** — movimientos de inventario y logs no se modifican
5. **Seguridad stateless** — JWT sin sesiones en servidor

## Decisiones clave

| Decisión | ADR |
|----------|-----|
| Gradle Wrapper | [[decisions/adr-001-gradle-wrapper]] |
| Arquitectura en capas | [[decisions/adr-002-layered-architecture]] |
| JWT para autenticación | [[decisions/adr-003-jwt-auth]] |
| Stock calculado desde movimientos | [[decisions/adr-004-stock-from-movements]] |
| Soft delete | [[decisions/adr-005-soft-delete]] |

## Ver también

- [[architecture/backend-layers]]
- [[architecture/frontend-structure]]
- [[architecture/database]]
- [[architecture/security]]
- [[architecture/integration-flows]]
- [[overview/bounded-contexts]]
