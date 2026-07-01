# SAPIENS ERP — Archivo de Memoria del Proyecto

> **Para Claude**: Este archivo es tu contexto de entrada. Léelo antes de cualquier tarea.
> El wiki completo está en `docs/wiki/`. Consúltalo para detalles — no re-derives lo que ya está documentado.

---

## Qué es este proyecto

ERP de gestión de inventario para una **pescadería**. Digitaliza compras, ventas, inventario, caja y reportes. El sistema vive en `sapiens-erp-ep/`.

**Stack:**
- Backend: Java 21 + Spring Boot 3.x · Build: `./gradlew` (Wrapper, nunca `gradle` global)
- Frontend: React 18 + TypeScript + Vite · Build: `npm run dev / build`
- BD: PostgreSQL 16 · Migraciones: Flyway

---

## Módulos (Bounded Contexts)

| Módulo | Qué gestiona | Wiki |
|--------|-------------|------|
| **Catalog** | Productos, categorías, unidades de medida | `docs/wiki/modules/catalog/` |
| **Inventory** | Stock, movimientos, lotes, mermas ← *Core Domain* | `docs/wiki/modules/inventory/` |
| **Procurement** | Proveedores, órdenes de compra | `docs/wiki/modules/procurement/` |
| **Sales** | Clientes, ventas, POS | `docs/wiki/modules/sales/` |
| **Finance** | Caja, gastos, facturación | `docs/wiki/modules/finance/` |
| **Reports** | Reportes transversales (solo lectura) | `docs/wiki/modules/reports/` |
| **Identity** | Usuarios, roles, JWT | `docs/wiki/modules/identity/` |

---

## Invariantes críticos — No negociables

### Inventario
1. **El stock nunca se edita directamente.** Se calcula sumando movimientos. No existe `setStockActual()`. Ver `docs/wiki/decisions/adr-004-stock-from-movements.md`
2. **Los movimientos de inventario son inmutables.** Solo `INSERT`, nunca `UPDATE` ni `DELETE` sobre `movimientos_inventario`.
3. **Stock no negativo.** Antes de cualquier egreso verificar stock. Lanzar `StockInsuficienteException` → HTTP 422.
4. **FIFO para lotes.** Consumir el lote con `fecha_ingreso` más antigua primero.
5. **Merma requiere motivo.** Campo `motivo` obligatorio en `MERMA` y ajustes.

### Datos
6. **PKs son UUID** generados en la app. Nunca `SERIAL`.
7. **Soft delete** para entidades de negocio. Columna `deleted_at TIMESTAMP`.
8. **Toda tabla de entidad** lleva `created_at`, `updated_at`, `deleted_at`.
9. **Migraciones Flyway obligatorias** para todo cambio de esquema. Nunca modificar migraciones existentes.

### Código
10. **Sin lógica en controllers.** Delegar al servicio de aplicación.
11. **`@Transactional` solo en `application/`.** Nunca en controllers ni repositorios.
12. **DTOs en la API.** Las entidades JPA nunca salen del backend.
13. **Sin `System.out.println`.** Usar SLF4J siempre.

---

## Estructura del proyecto

```
sapiens-erp-ep/
├── CLAUDE.MD                  ← Este archivo
├── sapiens-erp/               ← Vault de Obsidian
│   └── docs/wiki/             ← Fuente única de verdad
│       ├── _meta/             ← INDEX.md, GLOSSARY.md, LOG.md, ROADMAP.md
│       ├── overview/          ← vision, bounded-contexts, cross-cutting
│       ├── modules/           ← Un directorio por bounded context
│       │   ├── catalog/
│       │   ├── inventory/     ← Core domain, leer primero
│       │   ├── procurement/
│       │   ├── sales/
│       │   ├── finance/
│       │   ├── reports/
│       │   └── identity/
│       ├── architecture/      ← overview, capas, frontend, BD, seguridad, flujos
│       └── decisions/         ← ADRs (adr-001 a adr-005)
├── backend/
│   ├── gradlew                ← Siempre usar este
│   ├── build.gradle.kts
│   └── src/main/java/com/sapiens/erp/
│       └── modules/
│           └── <modulo>/
│               ├── api/        ← Controllers + DTOs
│               ├── application/← Services (@Transactional aquí)
│               ├── domain/     ← Entidades + Enums + Excepciones + Repositories
│               └── infrastructure/ ← Configuraciones
└── frontend/
    └── src/
        ├── features/           ← Un directorio por bounded context
        ├── shared/             ← Componentes y hooks reutilizables
        ├── store/              ← Zustand (auth, UI)
        └── api/                ← Cliente HTTP (Axios + interceptors JWT)
```

---

## Comandos de desarrollo

```bash
# Backend
cd backend
./gradlew bootRun          # Servidor en :8080
./gradlew test             # Tests
./gradlew clean build      # Build limpio

# Frontend
cd frontend
npm run dev                # Dev server en :5173
npm run build              # Build producción
npm run test               # Vitest

# BD local (con Docker)
docker-compose up -d       # Levanta PostgreSQL en :5432
```

---

## Convenciones de código

### Idioma en código
**Todos los identificadores de código están en inglés**: nombres de clases, campos Java, tablas SQL, columnas SQL, enums, DTOs, métodos.  
El lenguaje ubicuo del negocio (documentación, comentarios) permanece en español.

### Java
| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Servicios | sufijo `Service` | `ProductService` |
| Repositorios | sufijo `Repository` | `ProductRepository` |
| DTO entrada | sufijo `Request` | `ProductRequest` |
| DTO salida | sufijo `Response` | `ProductResponse` |
| Excepciones | sufijo `Exception` en `domain.exception/` | `InsufficientStockException` |
| Enums | en `domain/` | `MovementType`, `UnitOfMeasure`, `Role` |

### TypeScript / React
| Tipo | Convención |
|------|-----------|
| Componentes | PascalCase · `.tsx` |
| Hooks | prefijo `use` · `.ts` |
| API calls | en `features/<modulo>/api/` |
| Tipos/DTOs | sufijo `Dto` o `Request/Response` |

---

## Seguridad
- JWT stateless: access token 15 min, refresh token 7 días
- Roles: `ADMIN` > `SUPERVISOR` > `OPERADOR`
- BCrypt cost 12 para contraseñas
- Variables de entorno para secrets — nunca en código
- CORS explícito — nunca `allowedOrigins("*")` en producción

---

## API REST
- Base: `/api/v1/`
- Colecciones: plural y sustantivo (`/productos`, `/lotes`)
- Paginación: `{ content, page, size, totalElements }`
- Error: `{ status, error, message, timestamp }`
- HTTP codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`

---

## Wiki (Obsidian)

El directorio `sapiens-erp/docs/wiki/` es la fuente de verdad. Abrir la carpeta `sapiens-erp/` como vault en Obsidian.

**Al trabajar en el wiki:**
1. Antes de responder una consulta técnica: leer `docs/wiki/_meta/INDEX.md`
2. Buscar la página relevante y leerla antes de responder
3. Si la respuesta es valiosa: crear o actualizar la página correspondiente
4. Siempre actualizar `docs/wiki/_meta/LOG.md` al modificar el wiki
5. Si se agrega documentación nueva: actualizar `docs/wiki/_meta/INDEX.md`

**Operaciones wiki:**
- **Ingerir** nuevo requisito/decisión → actualizar módulo relevante + log + index
- **Lint** periódico → buscar contradicciones, referencias rotas, páginas huérfanas
- **ADR nuevo** → usar `docs/wiki/decisions/_template.md`

---

## Lo que NUNCA hacer

- Editar stock directamente (sin movimiento)
- Modificar o eliminar movimientos de inventario existentes
- Retornar entidades JPA desde controllers
- Poner `@Transactional` en controllers
- Usar `gradle` global (siempre `./gradlew`)
- Hardcodear URLs, puertos o credenciales
- Usar `System.out.println`
- Crear migración Flyway sin número secuencial
- Modificar una migración Flyway ya ejecutada
- Agregar lógica de negocio a controllers
- Usar `any` en TypeScript sin justificación explícita
- Crear una abstracción para resolver un problema que solo ocurre una vez
