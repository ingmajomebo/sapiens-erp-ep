---
tags: [arquitectura, stack]
fecha: 2026-06-21
---

# Stack Tecnológico

## Backend

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Java | 21 | Lenguaje base (LTS) |
| Spring Boot | 3.x | Framework principal |
| Spring Data JPA | — | ORM sobre Hibernate |
| Spring Security | — | Autenticación y autorización |
| Flyway | — | Migraciones de base de datos |
| JWT (jjwt) | — | Tokens de acceso |
| Gradle Wrapper | — | Build tool (siempre `./gradlew`) |

## Frontend

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React | 18 | UI |
| TypeScript | 5.x | Tipado estático |
| Vite | — | Build y dev server |
| React Query | — | Estado del servidor / fetching |
| React Hook Form | — | Manejo de formularios |
| Zod | — | Validación de esquemas |

## Base de Datos

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| PostgreSQL | 16 | Base de datos principal |

## Infraestructura de Desarrollo

| Tecnología | Rol |
|-----------|-----|
| Docker + docker-compose | Entorno local reproducible |

## Decisiones y justificaciones

- **Gradle sobre Maven**: Kotlin DSL ofrece mejor tipado en la configuración y el Gradle Wrapper garantiza reproducibilidad. Ver [[decisions/adr-001-gradle-wrapper]].
- **PostgreSQL**: Soporte nativo de UUID, JSONB para configuraciones, robustez en producción.
- **Java 21**: LTS con Virtual Threads (Project Loom) disponibles para concurrencia futura.
- **Flyway**: Migraciones versionadas en control de versiones, sin sorpresas en deploys.
