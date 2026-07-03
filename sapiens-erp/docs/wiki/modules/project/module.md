# Módulo: Project (Seguimiento de Proyecto)

> Bounded context de gestión del propio desarrollo del ERP: épicas, historias de usuario,
> tareas, sprints, proceso de QA y planificación de prompts para IA.
> Es un módulo "meta": no gestiona el negocio de la pescadería sino la construcción del sistema.

---

## Propósito

Digitalizar el ciclo de desarrollo del equipo (Manuel = DEV, Iskian = QA) dentro del propio ERP:

```
ÉPICA (EP-NN)
  └── HISTORIA DE USUARIO (RF-NNN / RNF-NNN)          ← formato Mike Cohn
        ├── ESCENARIOS GHERKIN (criterios de aceptación: Given/When/Then)
        │     └── EJECUCIONES DE PRUEBA QA (PASS/FAIL/BLOCKED/SKIPPED, inmutables)
        └── TASKS (DEV / QA / BUG / PLANNING / INFRA / DESIGN)
              └── PROMPT PLANS (prompts para Claude Code, con trazabilidad de efectividad)
```

## Stack y ubicación

- **Backend**: `backend/src/main/java/com/sapiens/erp/modules/project/` (api / application / domain)
- **Frontend**: `frontend/src/features/project/` — `ProjectPage.tsx` (~3.300 líneas, monolítico) + `api/projectApi.ts`
- **Migraciones**: V14 (sprints, tasks, prompts), V15 (historias + escenarios), V18 (trazabilidad prompts), V20 (épicas + QA), V21 (fix unicidad código épica)

## Modelo de datos

### `epics` (V20)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK generada en app |
| code | VARCHAR(20) | `EP-NN` autogenerado si no se envía; único entre activas (índice parcial, V21) |
| name | VARCHAR(150) | obligatorio |
| objective, success_criteria | TEXT | objetivo de negocio y criterios de éxito medibles |
| module | VARCHAR(50) | módulo del ERP al que pertenece |
| priority | LOW/MEDIUM/HIGH/CRITICAL | |
| status | PLANNED / IN_PROGRESS / DONE / ON_HOLD | |

### `user_stories` (V15, extendida en V20)
- `req_id` único (RF-NNN funcional / RNF-NNN no funcional)
- `epic_id` FK → epics (V20; el campo texto `epic` quedó como legacy sincronizado)
- Mike Cohn: `persona` (Como...), `action_statement` (quiero...), `outcome_statement` (para...)
- `story_type`: FUNCTIONAL | NON_FUNCTIONAL; los RNF llevan `nfr_category` + `nfr_criterion` (criterio medible)
- **status**: `DEFINED → IN_DEV → REVIEW → READY_FOR_QA → IN_QA → QA_FAILED → DONE | BLOCKED`

### `story_scenarios` (V15) — los criterios de aceptación
- `given_conditions`, `when_event`, `then_outcome` (Gherkin en español)
- `scenario_type`: HAPPY_PATH | NEGATIVE | EDGE · `sort_order`

### `scenario_test_executions` (V20) — proceso de QA
- FK a historia y escenario · **historial inmutable: solo INSERT, nunca UPDATE/DELETE**
- `result`: PASS | FAIL | BLOCKED | SKIPPED · `executed_by` (MANUEL/ISKIAN) · `notes` (evidencia)
- `defect_task_id` FK → project_tasks (BUG creado automáticamente al fallar)

### `project_tasks` (V14, extendida en V20)
- `task_type`: DEV | QA | BUG | PLANNING | INFRA | DESIGN
- `status`: TODO → IN_PROGRESS → REVIEW → DONE · `assignee`: MANUEL | ISKIAN
- `user_story_id` FK → user_stories (V20; `linked_requirement_id` texto se mantiene sincronizado)
- `sprint_id` FK → sprints · horas estimadas/reales

### `sprints` (V14) y `prompt_plans` (V14+V18)
- Sprints: PLANNING/ACTIVE/COMPLETED con objetivo y fechas
- Prompt plans: prompts para Claude Code por categoría, con `effectiveness_rating` (1–5) y notas de ejecución (V18); generación asistida por IA vía `/ai/generate-prompt` (Claude API, contexto configurable en `ai_context_settings`, V16)

## Reglas de negocio (QaExecutionService)

1. Registrar ejecución **deriva el estado de la historia automáticamente**:
   - resultado FAIL → historia pasa a `QA_FAILED`
   - todos los escenarios activos con último resultado PASS → historia pasa a `DONE`
   - cualquier otro caso → `IN_QA`
2. Un FAIL con `createDefect=true` **crea una task BUG** (prioridad HIGH, vinculada a la historia, título `BUG <reqId> — <escenario>`, asignable) y la referencia en la ejecución.
3. El escenario debe pertenecer a la historia (validación) — si no, 400.
4. Al borrar una épica (soft delete), sus historias quedan sin épica (no se borran).
5. Todo usa soft delete (`deleted_at`) y PKs UUID generadas en la app.

## API REST (`/api/v1`)

| Recurso | Endpoints |
|---|---|
| Épicas | `GET/POST /epics` · `PUT /epics/{id}` · `PATCH /epics/{id}/status` · `DELETE` — el GET incluye `totalStories`/`doneStories` |
| Historias | `GET/POST /user-stories` (filtros storyType/module/status) · `PUT /{id}` · `PATCH /{id}/status` · `DELETE` |
| Escenarios | `POST /user-stories/{storyId}/scenarios` · `PUT/DELETE /user-stories/scenarios/{scenarioId}` |
| QA | `GET /user-stories/{storyId}/test-executions` · `POST /user-stories/{storyId}/scenarios/{scenarioId}/test-executions` (devuelve `storyStatusAfter`) |
| Tasks | `GET/POST /project-tasks` (filtros sprint/assignee/status) · `PUT` · `PATCH /{id}/status` · `DELETE` |
| Sprints | `GET/POST /sprints` · `POST /{id}/activate` · `POST /{id}/complete` · `DELETE` |
| Prompts | CRUD `/prompt-plans` + `PATCH /{id}/execution` (rating + notas) |
| IA | `POST /ai/generate-prompt` · `GET/PUT /ai/context` |

## Frontend — pestañas de ProjectPage

1. **Dashboard** — KPIs de tasks por estado/persona, progreso del sprint
2. **Tablero** — kanban drag&drop de tasks (Por hacer / En curso / En revisión / Completado)
3. **Tareas** — tabla con filtros, edición, generación de prompt por task
4. **Requisitos** — tarjetas de épica (código, estado, barra de progreso done/total, objetivo, editar/borrar) con sus historias agrupadas debajo; tabla separada de RNF; KPIs por los 8 estados; modal de historia con select de épica; detalle de historia con escenarios (+ badge último resultado QA), historial de pruebas y tareas vinculadas; botón "Enviar a QA"
5. **QA** — KPIs del ciclo (Listas para QA / En QA / QA fallido / Completadas); historias en ciclo expandibles con panel de ejecución por escenario (notas de evidencia, checkbox "Crear BUG si falla", botones ✓ Pasa / ✗ Falla / ⊘ Bloqueado); sección de historias en desarrollo con botón "Enviar a QA"
6. **Prompts** — planificador de prompts con chat IA y trazabilidad de efectividad
7. **Configuración IA** — contexto del proyecto que se inyecta a la generación de prompts

## Flujo de trabajo del equipo

```
Manuel crea épica → historias con escenarios Gherkin → tasks DEV
→ desarrolla (historia IN_DEV) → "Enviar a QA" (READY_FOR_QA)
→ Iskian ejecuta cada escenario en la pestaña QA
   ├─ FAIL → historia QA_FAILED + task BUG automática para Manuel → corrige → re-envía a QA
   └─ todos PASS → historia DONE automática → la épica avanza su barra de progreso
```

## Limitaciones conocidas / deuda técnica (candidatas a mejora)

- `ProjectPage.tsx` es un monolito de ~3.300 líneas con estilos inline; sin subcomponentes en archivos separados ni sistema de diseño
- El ejecutor de QA está fijado a `ISKIAN` en la UI (no usa el usuario autenticado); no hay control de roles (cualquiera puede ejecutar QA o cambiar estados)
- Sin transiciones de estado validadas en backend (se puede pasar de DEFINED a DONE directamente vía PATCH)
- Las ejecuciones QA no soportan adjuntos de evidencia (screenshots), solo texto; no hay concepto de "ciclo/ronda de prueba" agrupador
- Historias RNF quedan fuera del ciclo de QA (solo aplican a funcionales)
- Épicas sin vínculo a sprints ni fechas objetivo; no hay burndown ni velocidad
- KPI strip de Requisitos con 8 columnas queda apretado en pantallas pequeñas
- Sin paginación en ningún listado (todo en memoria); sin búsqueda de texto en historias/tasks
- `tsc` no corre en el build de producción (deuda TypeScript en otros módulos); tests automatizados inexistentes para este módulo
- El campo legacy `user_stories.epic` (texto) sigue en la BD por compatibilidad
