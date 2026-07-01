# Project — API

## Autorización

Todos los endpoints requieren usuario autenticado. **Sin restricciones de rol** — cualquier rol puede acceder.

---

## Endpoints de Sprints

### GET /api/v1/sprints

Lista todos los sprints.

**Response 200:**
```json
[
  {
    "id": "...",
    "name": "Sprint 1 — Fundaciones",
    "goal": "Establecer la arquitectura base del sistema",
    "startDate": "2025-05-01",
    "endDate": "2025-05-15",
    "status": "COMPLETED"
  }
]
```

### POST /api/v1/sprints

**Request body:**
```json
{
  "name": "Sprint 2 — Módulo de ventas",
  "goal": "Implementar POS y registro de ventas",
  "startDate": "2025-06-01",
  "endDate": "2025-06-15"
}
```

**Response 201:** `SprintResponse`

### PUT /api/v1/sprints/{id}/activate

Activa un sprint (DRAFT → ACTIVE).

**Response 200:** `SprintResponse`

### PUT /api/v1/sprints/{id}/complete

Completa un sprint (ACTIVE → COMPLETED).

**Response 200:** `SprintResponse`

---

## Endpoints de Project Tasks

### GET /api/v1/project-tasks

Lista tareas con filtros opcionales.

**Query params:**
- `sprintId` (UUID)
- `status` (TaskStatus)
- `assignee` (TaskAssignee)
- `module` (String)

**Response 200:**
```json
[
  {
    "id": "...",
    "sprint": { "id": "...", "name": "Sprint 1" },
    "title": "Implementar módulo de inventario",
    "description": "Incluye lotes, movimientos y FIFO",
    "status": "DONE",
    "assignee": "MANUEL",
    "module": "inventory",
    "priority": "HIGH",
    "completedAt": "2025-05-10T15:00:00Z"
  }
]
```

### POST /api/v1/project-tasks

**Request body:**
```json
{
  "sprintId": "...",
  "title": "Implementar módulo de ventas",
  "description": null,
  "status": "TODO",
  "assignee": "MANUEL",
  "module": "sales",
  "priority": "HIGH"
}
```

**Response 201:** `ProjectTaskResponse`

### PUT /api/v1/project-tasks/{id}

Actualiza una tarea (incluyendo cambio de estado).

**Response 200:** `ProjectTaskResponse`

### DELETE /api/v1/project-tasks/{id}

Soft-delete de tarea.

**Response 204**

---

## Endpoints de Prompt Plans

### GET /api/v1/prompt-plans

Lista planes de prompt con filtros opcionales.

**Query params:**
- `status` (PromptStatus)
- `module` (String)
- `category` (PromptCategory)

**Response 200:**
```json
[
  {
    "id": "...",
    "title": "Base de Conocimiento — Sapiens ERP completo",
    "objective": "Proporcionar contexto completo del proyecto a Claude Code",
    "contextInfo": "...",
    "promptContent": "...",
    "module": "project",
    "category": "DOCUMENTATION",
    "status": "READY",
    "linkedTask": null
  }
]
```

### POST /api/v1/prompt-plans

**Request body:**
```json
{
  "title": "Implementar endpoint de ventas",
  "objective": "Crear POST /api/v1/sales con validaciones",
  "contextInfo": "Módulo de ventas aún no existe. Ver docs/modules/sales/",
  "promptContent": "Eres un desarrollador Java...",
  "module": "sales",
  "category": "FEATURE",
  "status": "DRAFT",
  "linkedTaskId": null
}
```

**Response 201:** `PromptPlanResponse`

### PUT /api/v1/prompt-plans/{id}

Actualiza un PromptPlan (incluyendo cambio de status).

**Response 200:** `PromptPlanResponse`

### DELETE /api/v1/prompt-plans/{id}

Soft-delete.

**Response 204**

---

## Endpoints de User Stories

### GET /api/v1/user-stories

Lista historias de usuario.

**Query params:** `taskId`, `status`, `module`

### POST /api/v1/user-stories

**Request body:**
```json
{
  "taskId": null,
  "title": "Registrar venta en caja",
  "asA": "operador de caja",
  "iWant": "registrar una venta con múltiples productos",
  "soThat": "el stock se actualice automáticamente",
  "acceptanceCriteria": "Ver escenarios Gherkin",
  "priority": "HIGH",
  "module": "sales"
}
```

### POST /api/v1/user-stories/{id}/scenarios

Agrega un escenario Gherkin a una historia.

**Request body:**
```json
{
  "title": "Venta exitosa con stock disponible",
  "given": "Dado que hay 10 KG de merluza en stock",
  "when": "Cuando el operador registra una venta de 2 KG",
  "then": "Entonces el stock queda en 8 KG y la venta es registrada"
}
```

**Response 201:** `ScenarioResponse`

---

## Endpoints de AI

### POST /api/v1/ai/generate-prompt

Genera un prompt usando la API de Anthropic.

**Request body:**
```json
{
  "taskTitle": "Implementar módulo de ventas",
  "taskDescription": "POS completo con líneas de venta y descuentos",
  "module": "sales",
  "additionalContext": "El sistema usa Spring Boot 3.5 + React 18"
}
```

**Response 200:**
```json
{
  "generatedPrompt": "Eres un desarrollador Java experto en Spring Boot..."
}
```

**Response 500:** si `AI_ANTHROPIC_API_KEY` no está configurada
