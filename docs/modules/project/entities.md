# Project — Entidades

## Sprint

Tabla: `sprints`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `name` | `String` | `name VARCHAR(100)` | NOT NULL |
| `goal` | `String` | `goal TEXT` | nullable |
| `startDate` | `LocalDate` | `start_date DATE` | nullable |
| `endDate` | `LocalDate` | `end_date DATE` | nullable |
| `status` | `SprintStatus` | `status VARCHAR(20)` | NOT NULL, DEFAULT 'DRAFT' |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio:**
- `activate()` → `status = ACTIVE`
- `complete()` → `status = COMPLETED`

### SprintStatus
```java
public enum SprintStatus { DRAFT, ACTIVE, COMPLETED }
```

---

## ProjectTask

Tabla: `project_tasks`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `sprint` | `Sprint` | `sprint_id UUID FK → sprints(id)` | nullable |
| `title` | `String` | `title VARCHAR(200)` | NOT NULL |
| `description` | `String` | `description TEXT` | nullable |
| `status` | `TaskStatus` | `status VARCHAR(20)` | NOT NULL, DEFAULT 'TODO' |
| `assignee` | `TaskAssignee` | `assignee VARCHAR(20)` | nullable |
| `module` | `String` | `module VARCHAR(50)` | nullable — bounded context |
| `priority` | `TaskPriority` | `priority VARCHAR(10)` | NOT NULL, DEFAULT 'MEDIUM' |
| `completedAt` | `Instant` | `completed_at TIMESTAMPTZ` | nullable — auto-set al pasar a DONE |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

**Métodos de dominio:**
- `updateStatus(newStatus)` → si `newStatus == DONE`, también establece `completedAt = now()`

### Enums de ProjectTask

```java
public enum TaskStatus { TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED }

public enum TaskAssignee { MANUEL, ISKIAN }   // Hardcoded al equipo actual

public enum TaskPriority { LOW, MEDIUM, HIGH, CRITICAL }
```

---

## PromptPlan

Tabla: `prompt_plans`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `title` | `String` | `title VARCHAR(200)` | NOT NULL |
| `objective` | `String` | `objective TEXT` | nullable |
| `contextInfo` | `String` | `context_info TEXT` | nullable |
| `promptContent` | `String` | `prompt_content TEXT` | NOT NULL |
| `module` | `String` | `module VARCHAR(50)` | nullable — bounded context objetivo |
| `category` | `PromptCategory` | `category VARCHAR(30)` | nullable |
| `status` | `PromptStatus` | `status VARCHAR(20)` | NOT NULL, DEFAULT 'DRAFT' |
| `linkedTask` | `ProjectTask` | `linked_task_id UUID FK → project_tasks(id)` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

### Enums de PromptPlan

```java
public enum PromptStatus { DRAFT, READY, USED, ARCHIVED }

public enum PromptCategory {
    FEATURE, BUG_FIX, REFACTOR, TEST, DOCUMENTATION, MIGRATION, CONFIGURATION
}
```

---

## UserStory

Tabla: `user_stories`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `task` | `ProjectTask` | `task_id UUID FK → project_tasks(id)` | nullable |
| `title` | `String` | `title VARCHAR(200)` | NOT NULL |
| `asA` | `String` | `as_a VARCHAR(100)` | nullable — "Como [rol]" |
| `iWant` | `String` | `i_want TEXT` | nullable — "Quiero [acción]" |
| `soThat` | `String` | `so_that TEXT` | nullable — "Para [beneficio]" |
| `acceptanceCriteria` | `String` | `acceptance_criteria TEXT` | nullable |
| `priority` | `StoryPriority` | `priority VARCHAR(10)` | NOT NULL, DEFAULT 'MEDIUM' |
| `status` | `StoryStatus` | `status VARCHAR(20)` | NOT NULL, DEFAULT 'DRAFT' |
| `module` | `String` | `module VARCHAR(50)` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |
| `deletedAt` | `Instant` | `deleted_at TIMESTAMPTZ` | soft delete |

---

## UserStoryScenario (Gherkin)

Tabla: `story_scenarios`

| Campo Java | Tipo Java | Columna SQL | Restricciones |
|-----------|----------|-------------|--------------|
| `id` | `UUID` | `id UUID PK` | App-generated |
| `userStory` | `UserStory` | `user_story_id UUID FK` | NOT NULL |
| `title` | `String` | `title VARCHAR(200)` | NOT NULL |
| `given` | `String` | `given_text TEXT` | nullable |
| `when` | `String` | `when_text TEXT` | nullable |
| `then` | `String` | `then_text TEXT` | nullable |
| `createdAt` | `Instant` | `created_at TIMESTAMPTZ` | de AuditableEntity |
| `updatedAt` | `Instant` | `updated_at TIMESTAMPTZ` | de AuditableEntity |

### Enums de UserStory

```java
public enum StoryPriority { LOW, MEDIUM, HIGH, CRITICAL }
public enum StoryStatus { DRAFT, READY, IN_PROGRESS, DONE, ARCHIVED }
```
