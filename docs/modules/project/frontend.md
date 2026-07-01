# Project — Frontend

## Pantalla: ProjectPage.tsx

Archivo: `frontend/src/features/project/ProjectPage.tsx` (~2364 líneas)
Ruta: `/project`

Esta es la pantalla más grande del frontend. Integra cuatro secciones principales en un layout con tabs o navegación interna.

### Secciones

#### 1. Tablero Kanban
- Columnas: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED
- Las tareas se muestran como cards con título, asignado (MANUEL/ISKIAN), prioridad y módulo
- Drag & drop (o botones de acción) para mover tareas entre columnas
- Filtros: por sprint activo, por asignado, por módulo

#### 2. Lista de Tareas
- Vista tabular de tareas con todas las columnas
- Acciones: crear, editar, eliminar tarea
- Filtro por sprint, status, asignado

#### 3. Planes de Prompt (Tab "Prompts")
- Lista de PromptPlans con filtro por status (DRAFT, READY, USED, ARCHIVED)
- Formulario de creación con campos: título, objetivo, contexto, contenido del prompt, módulo, categoría, tarea vinculada
- **Botón "Generar con IA"**: envía contexto al endpoint `/api/v1/ai/generate-prompt` y pre-rellena el campo `promptContent` con el resultado
- Acciones de estado: marcar como READY, USED, ARCHIVED

#### 4. Historias de Usuario (Tab "User Stories")
- Lista de UserStories con su estado y prioridad
- Formulario en formato "Como [asA], quiero [iWant], para que [soThat]"
- Sub-sección de escenarios Gherkin: tabla de escenarios con campos GIVEN / WHEN / THEN

### API calls

Archivo: `frontend/src/features/project/api/projectApi.ts`

```typescript
// Sprints
getSprints(): Promise<SprintResponse[]>
createSprint(data: SprintRequest): Promise<SprintResponse>
activateSprint(id: string): Promise<SprintResponse>
completeSprint(id: string): Promise<SprintResponse>

// Tasks
getProjectTasks(params?: TaskFilter): Promise<ProjectTaskResponse[]>
createProjectTask(data: ProjectTaskRequest): Promise<ProjectTaskResponse>
updateProjectTask(id: string, data: ProjectTaskRequest): Promise<ProjectTaskResponse>
deleteProjectTask(id: string): Promise<void>

// Prompt Plans
getPromptPlans(params?: PromptFilter): Promise<PromptPlanResponse[]>
createPromptPlan(data: PromptPlanRequest): Promise<PromptPlanResponse>
updatePromptPlan(id: string, data: PromptPlanRequest): Promise<PromptPlanResponse>
deletePromptPlan(id: string): Promise<void>

// User Stories
getUserStories(params?: StoryFilter): Promise<UserStoryResponse[]>
createUserStory(data: UserStoryRequest): Promise<UserStoryResponse>
updateUserStory(id: string, data: UserStoryRequest): Promise<UserStoryResponse>
addScenario(storyId: string, data: ScenarioRequest): Promise<ScenarioResponse>

// AI
generatePrompt(data: AiGenerateRequest): Promise<{ generatedPrompt: string }>
```

### Tipos TypeScript

```typescript
interface AiGenerateRequest {
  taskTitle: string;
  taskDescription?: string;
  module?: string;
  additionalContext?: string;
}

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
type TaskAssignee = 'MANUEL' | 'ISKIAN';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type PromptStatus = 'DRAFT' | 'READY' | 'USED' | 'ARCHIVED';
type PromptCategory = 'FEATURE' | 'BUG_FIX' | 'REFACTOR' | 'TEST' | 'DOCUMENTATION' | 'MIGRATION' | 'CONFIGURATION';
```

### Estado global

- TanStack Query gestiona todos los datos del módulo Project
- Al cambiar el status de una tarea, se invalida `queryKey: ['project-tasks']`
- El sprint activo se determina filtrando los sprints por `status === 'ACTIVE'`

---

## Observaciones del Arquitecto

### OBS-PROJ-FE-01: Archivo de 2364 líneas
`ProjectPage.tsx` es el archivo más grande del frontend. Se recomienda refactoring en componentes más pequeños: `KanbanBoard.tsx`, `PromptPlanList.tsx`, `UserStoryList.tsx`, `SprintSelector.tsx`.

### OBS-PROJ-FE-02: AI generation sin manejo de errores visible
Si `AI_ANTHROPIC_API_KEY` no está configurada o la llamada falla, el error llega como HTTP 500. No está claro si el frontend muestra un mensaje de error amigable al usuario.

### OBS-PROJ-FE-03: `TaskAssignee` hardcoded en UI
El selector de asignado en el formulario de tareas es un dropdown con solo dos opciones: MANUEL e ISKIAN. Si el equipo crece, debe actualizarse tanto el enum Java como el frontend.
