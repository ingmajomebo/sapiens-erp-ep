# Project — Reglas de Negocio

## BR-PROJ-01: Sin restricciones de rol

A diferencia de los demás módulos, los controllers del módulo Project no tienen `@PreAuthorize`. Cualquier usuario autenticado (ADMIN, SUPERVISOR, OPERATOR) puede leer y escribir en este módulo.

**Justificación**: el equipo actual solo tiene dos personas y la gestión del proyecto no requiere segregación de roles.

## BR-PROJ-02: Ciclo de vida de Sprint

- Solo puede haber un Sprint en estado ACTIVE a la vez (regla implícita, no validada en código)
- `activate()` solo llama a `status = ACTIVE`. No valida el estado previo ni bloquea si hay otro Sprint activo
- `complete()` solo llama a `status = COMPLETED`

## BR-PROJ-03: Auto-timestamp en tareas completadas

`ProjectTask.updateStatus(newStatus)`:
```java
this.status = newStatus;
if (newStatus == TaskStatus.DONE) {
    this.completedAt = Instant.now();
}
```

Al pasar una tarea a DONE, `completedAt` se establece automáticamente.

## BR-PROJ-04: Asignados hardcoded

El enum `TaskAssignee` solo tiene dos valores: `MANUEL` e `ISKIAN`. No existe una relación entre `ProjectTask` y la tabla `users`. Si el equipo crece, este enum debe extenderse manualmente.

## BR-PROJ-05: PromptPlan como interfaz con Claude Code

Un PromptPlan en estado READY es una "tarea" para Claude Code. El flujo esperado es:
1. Desarrollador crea PromptPlan (DRAFT)
2. Lo revisa y cambia a READY
3. Claude Code lo lee y ejecuta el `promptContent`
4. Claude Code (o el desarrollador) lo marca como USED

No existe un mecanismo automático de polling; es un proceso manual.

## BR-PROJ-06: Generación de prompts con IA

`AiAssistantService` envía el contexto al endpoint de Anthropic:
```
POST https://api.anthropic.com/v1/messages
Authorization: x-api-key: ${AI_ANTHROPIC_API_KEY}
```

El servicio construye un mensaje con el contexto de la tarea y las instrucciones del sistema, y devuelve el texto generado para que el usuario lo guarde como `promptContent` de un PromptPlan.

## BR-PROJ-07: Escenarios Gherkin sin validación de formato

Los campos `given`, `when`, `then` de `UserStoryScenario` son texto libre. El sistema no valida que sigan el formato Gherkin correcto (ej: no valida que `given` comience con "Given" o "Dado").

---

## Observaciones del Arquitecto

### OBS-PROJ-BR-01: Sin validación de Sprint único activo
No hay regla que impida activar un segundo Sprint mientras hay otro activo. Esto puede generar confusión en el tablero Kanban si las tareas filtran por "sprint activo".

### OBS-PROJ-BR-02: `TaskAssignee` no relaciona con `users`
Si un usuario `ISKIAN` es eliminado del sistema, sus tareas siguen mostrando `assignee = ISKIAN` sin error. No hay FK.

### OBS-PROJ-BR-03: API Key de Anthropic en variable de entorno
`AI_ANTHROPIC_API_KEY` se lee de entorno. Si no está configurada, el endpoint de IA fallará con 500 (sin manejo de error específico).
