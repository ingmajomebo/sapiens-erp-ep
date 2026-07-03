# Log del Wiki

> Registro cronológico append-only.
> Formato de entrada: `## [YYYY-MM-DD] tipo | descripción`
> Tipos: `init` | `ingest` | `update` | `refactor` | `query` | `lint` | `decision`

---

## [2026-07-03] ingest | Módulo Project: QA con trazabilidad completa (V22–V25, 5 etapas)

- **Etapa 1 (V22)**: ciclos de prueba `qa_test_runs` (RUN-NN, tipo, build, ambiente, OPEN/CLOSED) con alcance dinámico (TAG/EPIC/STORIES) materializado en items; snapshot JSONB inmutable del Gherkin en cada ejecución; `story_scenarios.version` (incrementa al editar), `tags text[]`, `is_active`
- **Etapa 2**: árbol de trazabilidad `GET /qa/test-runs/{id}/tree` (Run→Épica→Historia→Escenario→Ejecución), cobertura `GET /qa/coverage` (huecos de QA por épica), historial inverso `GET /user-stories/{id}/qa-history`; UI de ciclos en la pestaña QA + widget de cobertura; QaTab extraído a `components/`
- **Etapa 3 (V23/V24)**: máquina de estados de historias validada en backend (409 en transiciones inválidas; DONE solo por derivación de QA; BLOCKED recuerda estado previo; `force=true` administrativo); RNF REVIEW→DONE; reglas laxas en épicas/tasks; `executed_by_principal` = email del JWT; V24 fija `req_id` único solo entre activas
- **Etapa 4 (V25)**: evidencia adjunta PNG/JPEG/PDF ≤5MB (`qa_execution_attachments`, almacenamiento local `app.uploads.dir`); `ScenarioType.NFR_CHECK` autogenerable desde el criterio medible — los RNF recorren el mismo ciclo de QA
- **Etapa 5**: 34 tests del módulo (unit + integración MockMvc); paginación `page/size` y búsqueda `q` retrocompatibles en historias/tasks/ejecuciones; DashboardTab/ConfigTab extraídos + hook `useProjectData`
- Página [[modules/project/module]] actualizada con el nuevo modelo, API y deuda restante
- Verificación por etapa: 21+16+19+9 checks de API, 9 de paginación, Playwright sobre la UI

## [2026-07-03] update | Documentación completa del módulo Project + fix V21

- Creada página [[modules/project/module]] con el detalle completo del módulo de seguimiento de proyecto: modelo de datos (V14–V21), reglas de negocio de QA, API, pestañas del frontend, flujo del equipo y deuda técnica conocida
- INDEX.md actualizado con la fila del módulo Project
- Migración **V21**: la unicidad de `epics.code` pasa a índice parcial (solo épicas activas) — el UNIQUE global chocaba con soft delete y rompía la autogeneración de códigos EP-NN

## [2026-07-02] ingest | Módulo Project: Épicas como entidad + proceso de QA (migración V20)

- **Épicas** promovidas de texto libre (`user_stories.epic`) a entidad de primera clase: tabla `epics` con `code` (EP-NN autogenerado), `name`, `objective`, `success_criteria`, `module`, `priority`, `status` (PLANNED/IN_PROGRESS/DONE/ON_HOLD)
- Migración V20 convierte las épicas existentes automáticamente y vincula `user_stories.epic_id` (FK)
- **Tasks ↔ Historias**: nuevo FK `project_tasks.user_story_id` (antes solo texto `linked_requirement_id`, que se mantiene sincronizado por compatibilidad)
- **Proceso de QA** sobre los escenarios Gherkin (criterios de aceptación de cada historia):
  - Tabla `scenario_test_executions`: historial inmutable (solo INSERT) de ejecuciones PASS/FAIL/BLOCKED/SKIPPED con notas, ejecutor y task BUG opcional
  - `StoryStatus` extendido: `READY_FOR_QA`, `IN_QA`, `QA_FAILED` (además de los existentes)
  - Derivación automática de estado: FAIL → `QA_FAILED` (+ task BUG opcional asignada a dev); todos los escenarios con último resultado PASS → `DONE`; parcial → `IN_QA`
  - `TaskType` extendido con `BUG`
- API: `/api/v1/epics` (CRUD + PATCH status), `/api/v1/user-stories/{id}/test-executions` (GET historial, POST por escenario)
- Frontend: pestaña **QA** nueva en Project Tracker (KPIs, panel de ejecución por escenario, envío a QA); pestaña Requisitos reorganizada con tarjetas de épica (progreso historias done/total); modal de tarea ahora vincula historias por select
- Flujo del equipo: Manuel (DEV) desarrolla → "Enviar a QA" → Iskian (QA) ejecuta escenarios → FAIL crea BUG para Manuel → re-test → DONE automático

## [2026-06-24] update | HU-001 validado y corregido contra código real (flujo completo)

- Leídos `ProductRequest.java` y `GlobalExceptionHandler.java` para verificar comportamiento exacto
- Corrección crítica: `IllegalArgumentException` → HTTP **409 CONFLICT** (no 400); lo confirma el handler en `GlobalExceptionHandler`
- Validaciones `@NotBlank`/`@NotNull`/`@DecimalMin` fallidas → HTTP 400 `VALIDATION_ERROR` (vía `MethodArgumentNotValidException`)
- HU-001 reescrito con flujo UX completo (10 pasos de apertura → guardar exitoso; flujo de error)
- Agregada tabla de campos completa con columna de anotación backend real
- Agregada tabla de validaciones con HTTP codes exactos
- HU-002 corregido: HTTP 409 en todos los escenarios y en la tabla de comportamiento
- `description` documentado como "no expuesto en UI actual" (campo existe en backend pero se envía null)
- `purchaseCost` documentado como "no expuesto en UI" (se captura automáticamente en recepciones)

## [2026-06-24] update | HU-001 reescrito + HU-002 + HU-003 desde código real

- HU-001 reescrito basado en código real (`ProductController.java`, `ProductService.java`, `Drawer.tsx`):
  - Corregido rol: OPERADOR NO puede crear productos (solo SUPERVISOR y ADMIN)
  - Corregido HTTP code para nombre duplicado: es 400 (no 409) porque `IllegalArgumentException` → HTTP 400
  - Corregido: `purchaseCost` NO tiene campo en el formulario de creación; hay banner informativo en sección Precios
  - Corregido: imagen con archivo local es "solo vista previa" — no se persiste al servidor
  - Agregado: categoría fiscal deshabilitada (próximamente)
  - Agregado: creación inline de categoría documentada como flujo alternativo C
- Creado HU-002: rechazo por nombre duplicado — comportamiento real del backend y frontend
- Creado HU-003: crear categoría inline desde el Drawer — flujo UX real con autoFocus, Enter y manejo de errores
- INDEX actualizado con 3 user stories bajo Catalog

## [2026-06-24] ingest | HU-001 — Crear Producto

- Creado primer documento de historia de usuario en `modules/catalog/user-stories/HU-001-crear-producto.md`
- Cubre: precondiciones, 14 campos del formulario, flujo principal, 4 flujos alternativos, 10 criterios de aceptación, 8 reglas de negocio, validaciones API, diseño UX e implementación técnica
- Refleja los campos reales de `ProductRequest.java` y la lógica de costos de V9 (`purchase_cost_last`, `average_cost`)
- Creada estructura `modules/catalog/user-stories/` para futuras HU del módulo
- INDEX actualizado con sección "Historias de usuario"

## [2026-06-24] update | Valoración de inventario por Costo Promedio Ponderado

- Migración V9: columnas `purchase_cost_last` y `average_cost` en `products`; `previous_average_cost` y `new_average_cost` en `inventory_movements`
- `Product.java`: nuevos campos + método `applyEntryAndRecalculateCost()` con fórmula CPP
- `InventoryService`: `registerEntry()` y `registerAdjustment()` recalculan costo promedio en movimientos positivos
- `ProductResponse` y `MovementResponse` exponen los nuevos campos
- Frontend: `ProductDto` y `ProductDetailModal` muestran "Último costo de compra" y "Costo promedio ponderado"

## [2026-06-21] decision | Convención: nombres en código en inglés

- Todos los identificadores de código (tablas SQL, columnas, clases Java, campos, enums, DTOs) pasan a inglés
- Lenguaje ubicuo del negocio (documentación, comentarios) permanece en español
- Impacto: `Usuario` → `User`, `Producto` → `Product`, `TipoMovimiento` → `MovementType`, `OPERADOR` → `OPERATOR`, etc.
- Wiki actualizado: entities/user.md, entities/product.md, entities/movement.md, entities/lot.md, database.md, backend-layers.md
- CLAUDE.MD actualizado con la convención

## [2026-06-21] ingest | Backend Spring Boot inicializado

- Proyecto creado con Spring Boot 3.5.0 + Java 17 (Gradle Wrapper)
- Módulo Identity: `User`, `RefreshToken`, JWT auth (login/refresh/logout), BCrypt cost 12, `DataInitializer` (admin@sapiens.com)
- Módulo Catalog: `Product`, `Category`, CRUD completo con paginación y soft delete
- Módulo Inventory scaffolding: `MovementType`, `InsufficientStockException`
- Migraciones Flyway: V1 (identity schema), V2 (catalog schema)
- `docker-compose.yml` para PostgreSQL 16 en :5432
- Tests manuales verificados: health check, login, productos CRUD
- Build: `./gradlew build -x test` ✓, `./gradlew bootRun` ✓

## [2026-06-21] ingest | Implementación del frontend React

- Scaffolding completo del frontend en `frontend/` con Vite + React 18 + TypeScript + Zustand
- Stack alineado con `architecture/frontend-structure.md`: features por página, shared components, store, api/
- Dependencias: `zustand`, `@tanstack/react-query`, `axios`
- 8 vistas implementadas como UI prototype con datos mock:
  - Dashboard (KPIs, gráficos, top productos, stock bajo, vencimientos)
  - Inventory (tabla de productos con lotes, SKUs, estado de stock)
  - Purchases (órdenes de compra)
  - Sales (órdenes de venta)
  - Cash Register (sesión de caja, movimientos, métodos de pago)
  - Invoicing (facturas con AR, vencidas, cobradas)
  - Accounting (P&L, cashflow, AR/AP)
  - Expenses (gastos por categoría y método)
- Infraestructura de backend preparada: `api/client.ts` (Axios + JWT interceptor), `api/queryClient.ts`
- `shared/types.ts` con tipos compartidos del dominio (PaginatedResponse, ErrorResponse, enums)
- UI fiel al diseño `Marisqueria ERP.dc.html`: light/dark theme, multi-idioma (EN/ES/PT)
- **Nota**: INV-001 visible en formulario de producto (stock readonly, ajustar vía movimientos)

## [2026-06-21] refactor | Reestructuración completa del wiki

- Migración de estructura plana a estructura modular por Bounded Context (DDD)
- Creada jerarquía: `_meta/`, `overview/`, `modules/`, `architecture/`, `decisions/`
- Módulos definidos: Catalog, Inventory, Procurement, Sales, Finance, Reports, Identity
- Documentados 5 ADRs fundacionales
- Creado glosario de lenguaje ubicuo
- Creados flujos de integración entre módulos
- CLAUDE.MD reescrito como archivo de memoria del proyecto
- Documentación previa migrada a nueva estructura

## [2026-06-21] init | Creación inicial del wiki

- Estructura inicial plana: `domain/`, `architecture/`, `api/`, `decisions/`
- Entidades documentadas: Producto, Lote, MovimientoInventario, Proveedor, Venta, Alerta
- ADR-001: Gradle Wrapper registrado
