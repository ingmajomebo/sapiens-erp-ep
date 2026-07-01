# Arquitectura General — Sapiens ERP

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Java + Spring Boot | Java 17 (build), Java 21 (runtime), Spring Boot 3.5.0 |
| Build tool | Gradle Wrapper | `./gradlew` — nunca usar `gradle` global |
| Persistencia | PostgreSQL | 16 |
| Migraciones | Flyway | `classpath:db/migration` |
| ORM | Spring Data JPA + Hibernate | Dialecto PostgreSQL |
| Seguridad | Spring Security + JWT | JJWT 0.12.6 |
| Validación | Jakarta Validation | via Spring Boot starter |
| Utilidades | Lombok | compile-only |
| Frontend | React + TypeScript | React 18, TypeScript |
| Bundler | Vite | — |
| Estado | Zustand | persist middleware |
| HTTP | Axios | con interceptores JWT |
| Queries | TanStack Query | useQuery / useMutation |

> **Nota del Arquitecto**: El `build.gradle.kts` declara `sourceCompatibility = JavaVersion.VERSION_17` y `targetCompatibility = JavaVersion.VERSION_17`, pero el CLAUDE.md indica Java 21. El bytecode compilado es Java 17. Verificar si el runtime es Java 21 o si hay inconsistencia.

## Puertos y URLs

| Servicio | Puerto | URL base |
|---------|--------|---------|
| Backend API | 8080 | `http://localhost:8080/api/v1/` |
| Frontend Dev | 5173 | `http://localhost:5173` |
| PostgreSQL | 5432 | `sapiens_erp` / usuario `sapiens` |
| Health check | 8080 | `/actuator/health` |

## Diagrama de arquitectura

```mermaid
graph TB
    subgraph Frontend ["Frontend (React 18 + Vite)"]
        FE_Auth["Auth Store\n(Zustand + localStorage)"]
        FE_API["API Client\n(Axios + interceptors)"]
        FE_Pages["Feature Pages\n(Inventory, Procurement,\nFinance, Project...)"]
        FE_Query["TanStack Query\n(cache + invalidation)"]
    end

    subgraph Backend ["Backend (Spring Boot 3.5)"]
        SEC["SecurityConfig\n(JWT Filter + CORS)"]
        
        subgraph Modules
            ID["identity\n(auth, users, roles)"]
            CAT["catalog\n(products, categories)"]
            INV["inventory\n(lots, movements, FIFO)"]
            PRO["procurement\n(suppliers, POs, receipts)"]
            FIN["finance\n(accounts payable,\nfinancial accounts)"]
            PROJ["project\n(sprints, tasks,\nprompts, stories)"]
            AI["ai\n(Anthropic integration)"]
        end

        EX["GlobalExceptionHandler\n(@RestControllerAdvice)"]
    end

    subgraph DB ["PostgreSQL 16"]
        FLY["Flyway\nV1 → V15"]
        TABLES["users, products,\nlots, inventory_movements,\nsuppliers, purchase_orders,\naccounts_payable,\nfinancial_accounts,\nsprints, project_tasks,\nprompt_plans, user_stories"]
    end

    FE_Pages --> FE_Query
    FE_Query --> FE_API
    FE_API --> FE_Auth
    FE_API -- "HTTP Bearer" --> SEC
    SEC --> Modules
    Modules --> DB
    FLY --> TABLES
```

## Capas del backend (por módulo)

```
modules/<modulo>/
├── api/
│   ├── <ModuleName>Controller.java     ← REST endpoints, sin lógica
│   └── dto/
│       ├── <Entity>Request.java        ← Input (validado con @Valid)
│       └── <Entity>Response.java       ← Output (record con factory from())
├── application/
│   └── <ModuleName>Service.java        ← Toda la lógica. @Transactional aquí.
└── domain/
    ├── <Entity>.java                   ← Entidad JPA, extiende AuditableEntity
    ├── <Entity>Repository.java         ← Spring Data JPA
    ├── <SomeEnum>.java
    └── exception/
        └── <Something>Exception.java
```

## Flujo de una petición autenticada

```mermaid
sequenceDiagram
    participant C as Cliente (React)
    participant F as JwtAuthenticationFilter
    participant S as Service (@Transactional)
    participant R as Repository
    participant DB as PostgreSQL

    C->>F: HTTP Request + Bearer token
    F->>F: validateToken() → Claims
    F->>F: SecurityContextHolder.setAuthentication()
    F->>S: Delegación al Controller
    S->>R: findBy... / save()
    R->>DB: SQL via Hibernate
    DB-->>R: ResultSet
    R-->>S: Entidad JPA
    S-->>F: DTO Response
    F-->>C: HTTP 200 + JSON
```

## Manejo de errores

El `GlobalExceptionHandler` centraliza todas las excepciones:

| Excepción | HTTP | Código de error |
|-----------|------|-----------------|
| `MethodArgumentNotValidException` | 400 | `VALIDATION_ERROR` |
| `EntityNotFoundException` | 404 | `NOT_FOUND` |
| `InsufficientStockException` | 422 | `INSUFFICIENT_STOCK` |
| `BadCredentialsException` | 401 | `UNAUTHORIZED` |
| `AccessDeniedException` | 403 | `FORBIDDEN` |
| `IllegalArgumentException` | 409 | `CONFLICT` |
| `Exception` (genérica) | 500 | `INTERNAL_ERROR` |

Formato de respuesta de error:
```json
{
  "status": 422,
  "error": "INSUFFICIENT_STOCK",
  "message": "Stock insuficiente para el producto ...",
  "timestamp": "2026-06-28T10:00:00Z"
}
```

## Módulos y dependencias entre bounded contexts

```mermaid
graph LR
    CAT[Catalog] --> INV[Inventory]
    CAT --> PRO[Procurement]
    CAT --> FIN[Finance]
    PRO --> INV
    PRO --> FIN
    FIN --> PRO
    ID[Identity] -.->|"@PreAuthorize"| CAT
    ID -.-> INV
    ID -.-> PRO
    ID -.-> FIN
    PROJ[Project] -.->|"módulo de meta-tracking"| CAT
    PROJ -.-> INV
    PROJ -.-> PRO
    PROJ -.-> FIN
```
