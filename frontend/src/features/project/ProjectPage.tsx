import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  sprintsApi, projectTasksApi, promptPlansApi, userStoriesApi, aiApi, epicsApi, qaApi,
  type SprintDto, type ProjectTaskDto, type PromptPlanDto,
  type TaskStatus, type TaskType, type TaskAssignee, type TaskPriority,
  type PromptCategory, type PromptStatus,
  type UserStoryDto, type StoryType, type StoryStatus, type NfrCategory,
  type ScenarioType, type UserStoryRequest, type StoryScenarioRequest,
  type EpicDto, type EpicRequest, type EpicStatus,
  type TestExecutionDto,
  type AiChatMessage,
  type AiContextDto,
} from './api/projectApi'
import { toast } from '../../shared/toast'
import { QaTab } from './components/QaTab'
import {
  MODULES, MODULE_LABELS,
  TASK_TYPE_LABELS, TASK_TYPE_COLORS,
  STATUS_LABELS, STATUS_COLORS, STATUS_BG,
  PRIORITY_LABELS, PRIORITY_COLORS,
  PROMPT_CAT_LABELS, PROMPT_CAT_COLORS,
  PROMPT_STATUS_LABELS, PROMPT_STATUS_COLORS,
  STORY_STATUS_LABELS, STORY_STATUS_COLORS,
  EPIC_STATUS_LABELS, EPIC_STATUS_COLORS,
  TEST_RESULT_LABELS, TEST_RESULT_COLORS,
  NFR_CAT_LABELS, NFR_CAT_COLORS,
  SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS,
  NEXT_STATUS,
  Badge, Avatar, KpiCard,
  overlayStyle, modalStyle, modalHeaderStyle, closeBtnStyle, labelStyle, inputStyle,
  btnPrimaryStyle, btnSecondaryStyle, iconBtnStyle,
} from './components/shared'

// ─── helpers ────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'board' | 'tasks' | 'prompts' | 'requirements' | 'qa' | 'config'

// ─── Task Modal ──────────────────────────────────────────────────────────────

function TaskModal({
  task, sprints, stories, onClose, onSave, prefill,
}: {
  task: ProjectTaskDto | null
  sprints: SprintDto[]
  stories: UserStoryDto[]
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  prefill?: { storyId?: string; module: string; title?: string }
}) {
  const [title, setTitle] = useState(task?.title ?? prefill?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [taskType, setTaskType] = useState<TaskType>(task?.taskType ?? 'DEV')
  const [assignee, setAssignee] = useState<string>(task?.assignee ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM')
  const [sprintId, setSprintId] = useState(task?.sprintId ?? '')
  const [module, setModule] = useState(task?.module ?? prefill?.module ?? '')
  const [userStoryId, setUserStoryId] = useState(task?.userStoryId ?? prefill?.storyId ?? '')
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      title, description, taskType,
      assignee: assignee || null,
      priority,
      sprintId: sprintId || null,
      module: module || null,
      userStoryId: userStoryId || null,
      estimatedHours: estimatedHours ? parseInt(estimatedHours) : null,
      notes: notes || null,
    })
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={taskType} onChange={e => setTaskType(e.target.value as TaskType)}>
                {(['DEV', 'QA', 'BUG', 'PLANNING', 'INFRA', 'DESIGN'] as TaskType[]).map(t => (
                  <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Asignado a</label>
              <select style={inputStyle} value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Sin asignar</option>
                <option value="MANUEL">Manuel (DEV)</option>
                <option value="ISKIAN">Iskian (QA)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sprint</label>
              <select style={inputStyle} value={sprintId} onChange={e => setSprintId(e.target.value)}>
                <option value="">Sin sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Módulo</label>
              <select style={inputStyle} value={module} onChange={e => setModule(e.target.value)}>
                <option value="">Sin módulo</option>
                {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Historia vinculada</label>
              <select style={inputStyle} value={userStoryId} onChange={e => setUserStoryId(e.target.value)}>
                <option value="">Sin historia</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reqId} — {(s.actionStatement ?? s.description ?? '').slice(0, 50)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Horas estimadas</label>
              <input style={inputStyle} type="number" min="0" value={estimatedHours}
                onChange={e => setEstimatedHours(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnPrimaryStyle}>
              {task ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({
  task, stories, prompts, onClose, onEdit, onGeneratePrompt, onStatusChange,
}: {
  task: ProjectTaskDto
  stories: UserStoryDto[]
  prompts: PromptPlanDto[]
  onClose: () => void
  onEdit: () => void
  onGeneratePrompt: () => void
  onStatusChange: (status: TaskStatus) => void
}) {
  const linkedStory = stories.find(s => s.reqId === task.linkedRequirementId)
  const linkedPrompts = prompts.filter(p => p.linkedTaskId === task.id)
  const next = NEXT_STATUS[task.status]

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {task.linkedRequirementId && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>
                  {task.linkedRequirementId}
                </span>
              )}
              <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{TASK_TYPE_LABELS[task.taskType]}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{task.title}</h3>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge label={STATUS_LABELS[task.status]} color={STATUS_COLORS[task.status]} />
            <Badge label={PRIORITY_LABELS[task.priority]} color={PRIORITY_COLORS[task.priority]} />
            {task.module && <Badge label={MODULE_LABELS[task.module] ?? task.module} color="#64748b" />}
            {task.assignee && <Badge label={task.assignee === 'MANUEL' ? 'Manuel' : 'Iskian'} color="#0891b2" />}
            {task.sprintName && <Badge label={task.sprintName} color="#7c3aed" />}
            {(task.estimatedHours != null) && (
              <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
                {task.estimatedHours}h est.{task.actualHours != null ? ` / ${task.actualHours}h real` : ''}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <div style={sectionLabelStyle}>Descripción</div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{task.description}</p>
            </div>
          )}

          {/* Criterios de aceptación */}
          {linkedStory && linkedStory.scenarios.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>
                Criterios de aceptación
                <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#6366f1', marginLeft: 6 }}>
                  ← {linkedStory.reqId}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {linkedStory.scenarios.map((sc, i) => (
                  <div key={sc.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{sc.scenarioTitle}</span>
                      <Badge label={SCENARIO_TYPE_LABELS[sc.scenarioType]} color={SCENARIO_TYPE_COLORS[sc.scenarioType]} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13.5, lineHeight: 1.5 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dado </span>
                        <span style={{ color: 'var(--text)' }}>{sc.givenConditions}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuando </span>
                        <span style={{ color: 'var(--text)' }}>{sc.whenEvent}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: '#10b981', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entonces </span>
                        <span style={{ color: 'var(--text)' }}>{sc.thenOutcome}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompts asociados */}
          {linkedPrompts.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Prompts asociados ({linkedPrompts.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedPrompts.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.title}</div>
                      {p.module && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{MODULE_LABELS[p.module] ?? p.module}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.effectivenessRating != null && (
                        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>⭐ {p.effectivenessRating}/5</span>
                      )}
                      <Badge label={PROMPT_STATUS_LABELS[p.status]} color={PROMPT_STATUS_COLORS[p.status]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {task.notes && (
            <div>
              <div style={sectionLabelStyle}>Notas</div>
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                padding: '12px 14px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {task.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {next && (
                <button type="button" style={btnPrimaryStyle} onClick={() => onStatusChange(next)}>
                  → {STATUS_LABELS[next]}
                </button>
              )}
              <button type="button" style={{ ...btnSecondaryStyle, color: '#6366f1', borderColor: '#6366f1' }} onClick={onGeneratePrompt}>
                📝 Generar prompt
              </button>
            </div>
            <button type="button" style={btnSecondaryStyle} onClick={onEdit}>✏️ Editar tarea</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sprint Modal ─────────────────────────────────────────────────────────────

function SprintModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, goal: goal || null, startDate: startDate || null, endDate: endDate || null })
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nuevo Sprint</h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Objetivo del sprint</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              value={goal} onChange={e => setGoal(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Fecha inicio</label>
              <input style={inputStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Fecha fin</label>
              <input style={inputStyle} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnPrimaryStyle}>Crear sprint</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Prompt Modal ─────────────────────────────────────────────────────────────

// ─── Secciones fijas del prompt de contexto ──────────────────────────────────

const SECTION_RESTRICTIONS = `## 6. Restricciones
- No romper funcionalidades existentes
- No modificar migraciones anteriores (V1–V16, próxima V17)
- No crear código duplicado
- Mantener la arquitectura DDD Modular
- Reutilizar entidades, servicios y componentes existentes antes de crear nuevos
- No cambiar convenciones del proyecto
- PKs deben ser UUID generados en la aplicación (nunca SERIAL)
- Soft delete obligatorio en entidades de negocio (deleted_at TIMESTAMPTZ)`

const SECTION_PROCESS = (moduleLabel: string) => `## 7. Proceso obligatorio para Claude Code
Antes de escribir código debes:
1. Analizar completamente el proyecto
2. Analizar el módulo ${moduleLabel}
3. Detectar entidades existentes
4. Detectar servicios existentes
5. Detectar repositorios existentes
6. Detectar DTOs existentes
7. Detectar excepciones existentes
8. Detectar componentes reutilizables
9. Detectar patrones arquitectónicos utilizados
10. Detectar convenciones del proyecto

No escribas código hasta terminar este análisis.`

const SECTION_POLICY = `## 8. Política de implementación
- Reutilizar antes de crear
- No crear clases si ya existe una equivalente
- No crear DTOs duplicados
- No crear excepciones duplicadas
- Mantener el estilo del proyecto
- Si detectas varias alternativas de implementación, elegir la más consistente con la arquitectura existente
- No inventar convenciones nuevas`

const SECTION_AUTONOMY = `## 9. Autonomía
Claude puede tomar decisiones de implementación siempre que:
- Respete la arquitectura existente
- No rompa funcionalidades
- No modifique reglas de negocio existentes
- Justifique brevemente las decisiones arquitectónicas importantes`

const SECTION_RESULT = `## 10. Resultado esperado
Al finalizar debes entregar:
- Archivos creados
- Archivos modificados
- Cambios realizados
- Reglas de negocio implementadas
- Riesgos encontrados
- Posibles mejoras
- Deuda técnica detectada`

// ─── PromptModal ──────────────────────────────────────────────────────────────

function PromptModal({
  prompt, stories, onClose, onSave, initialLinkedTaskId, prefillTask, prefillStory,
}: {
  prompt: PromptPlanDto | null
  stories: UserStoryDto[]
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
  initialLinkedTaskId?: string
  prefillTask?: ProjectTaskDto
  prefillStory?: UserStoryDto
}) {
  const defaultTitle = prefillTask
    ? `[${prefillTask.linkedRequirementId ?? prefillTask.title}] Implementar`
    : ''
  const defaultObjective = prefillTask?.description
    || (prefillStory?.persona
      ? `Como ${prefillStory.persona}, quiero ${prefillStory.actionStatement}, para ${prefillStory.outcomeStatement}.`
      : '')

  const [title, setTitle] = useState(prompt?.title ?? defaultTitle)
  const [objective, setObjective] = useState(prompt?.objective ?? defaultObjective)
  const [contextInfo, setContextInfo] = useState(prompt?.contextInfo ?? '')
  const [promptContent, setPromptContent] = useState(prompt?.promptContent ?? '')
  const [module, setModule] = useState(prompt?.module ?? prefillTask?.module ?? '')
  const [category, setCategory] = useState<PromptCategory>(prompt?.category ?? 'NEW_FEATURE')
  const [linkedStoryId, setLinkedStoryId] = useState(prefillStory?.id ?? '')
  const [linkedTaskId, setLinkedTaskId] = useState(prompt?.linkedTaskId ?? initialLinkedTaskId ?? '')

  const selectedStory = stories.find(s => s.id === linkedStoryId) ?? null
  const moduleLabel = module ? (MODULE_LABELS[module] ?? module) : 'No especificado'

  // Build business rules from Gherkin scenarios
  function extractBusinessRules(story: UserStoryDto): string {
    if (story.scenarios.length === 0) return ''
    const rules = story.scenarios.map(sc => `- ${sc.scenarioTitle}: cuando ${sc.whenEvent.toLowerCase()}, entonces ${sc.thenOutcome.toLowerCase()}`)
    return rules.join('\n')
  }

  // Build the full 10-section prompt locally
  function buildPrompt(): string {
    const sep = '\n\n---\n\n'
    const parts: string[] = []

    parts.push(`## 1. Contexto del proyecto
Proyecto: Sapiens ERP
Arquitectura: DDD Modular
Backend: Java 21 + Spring Boot 3.x
Frontend: React 18 + TypeScript + Vite
Base de datos: PostgreSQL 16
Migraciones: Flyway (V1–V16 aplicadas, próxima V17)
Módulo: ${moduleLabel}`)

    if (selectedStory) {
      let storySection = `## 2. Historia de usuario\n${selectedStory.reqId}\n`
      if (selectedStory.persona) {
        storySection += `Como ${selectedStory.persona},\nquiero ${selectedStory.actionStatement},\npara ${selectedStory.outcomeStatement}.`
      } else if (selectedStory.nfrCriterion) {
        storySection += selectedStory.nfrCriterion
      } else if (selectedStory.description) {
        storySection += selectedStory.description
      }
      if (selectedStory.epicName) storySection += `\nÉpica: ${selectedStory.epicCode} — ${selectedStory.epicName}`
      parts.push(storySection)
    }

    parts.push(`## 3. Objetivo funcional\n${objective || '(completar antes de usar el prompt)'}`)

    parts.push(`## 4. Contexto actual\n${contextInfo || '(describir el estado actual del módulo)'}`)

    if (selectedStory) {
      const rules = extractBusinessRules(selectedStory)
      parts.push(`## 5. Reglas de negocio\n${rules || '(sin escenarios definidos — agregar manualmente)'}`)
    } else {
      parts.push(`## 5. Reglas de negocio\n(seleccionar una historia de usuario para auto-extraer las reglas)`)
    }

    parts.push(SECTION_RESTRICTIONS)
    parts.push(SECTION_PROCESS(moduleLabel))
    parts.push(SECTION_POLICY)
    parts.push(SECTION_AUTONOMY)
    parts.push(SECTION_RESULT)

    return parts.join(sep)
  }

  const refineMut = useMutation({
    mutationFn: (msgs: AiChatMessage[]) => aiApi.generate(msgs),
    onSuccess: (data) => {
      setPromptContent(data.content)
      toast({ type: 'success', message: 'Prompt refinado por IA' })
    },
    onError: () => toast({ type: 'error', message: 'Error al refinar con IA' }),
  })

  const objectiveMut = useMutation({
    mutationFn: (msgs: AiChatMessage[]) => aiApi.generate(msgs),
    onSuccess: data => { setObjective(data.content); toast({ type: 'success', message: 'Objetivo generado' }) },
    onError: () => toast({ type: 'error', message: 'Error al generar objetivo' }),
  })

  const contextMut = useMutation({
    mutationFn: (msgs: AiChatMessage[]) => aiApi.generate(msgs),
    onSuccess: data => { setContextInfo(data.content); toast({ type: 'success', message: 'Contexto generado' }) },
    onError: () => toast({ type: 'error', message: 'Error al generar contexto' }),
  })

  function generateObjective() {
    const story = prefillStory ?? selectedStory
    let msg = `Eres un analista funcional del ERP Sapiens. Escribe el objetivo funcional para la siguiente tarea.\n`
    msg += `REGLA: Solo descripción funcional en 2-3 oraciones. NO código. NO detalles técnicos. En español.\n\n`
    msg += `Tarea: ${title || prefillTask?.title || '(sin título)'}\nMódulo: ${moduleLabel}\n`
    if (prefillTask?.linkedRequirementId) msg += `RF: ${prefillTask.linkedRequirementId}\n`
    if (story?.persona) msg += `\nHistoria: Como ${story.persona}, quiero ${story.actionStatement}, para ${story.outcomeStatement}.\n`
    if (story?.scenarios.length) {
      msg += `\nEscenarios:\n`
      story.scenarios.forEach(sc => { msg += `• ${sc.scenarioTitle}: cuando ${sc.whenEvent.toLowerCase()}, entonces ${sc.thenOutcome.toLowerCase()}\n` })
    }
    msg += `\nEscribe únicamente el texto del objetivo funcional, sin encabezados ni explicaciones adicionales.`
    objectiveMut.mutate([{ role: 'user', content: msg }])
  }

  function generateContext() {
    const story = prefillStory ?? selectedStory
    let msg = `Eres un analista funcional del ERP Sapiens. Describe el contexto actual del módulo ${moduleLabel}.\n`
    msg += `REGLA: Describe qué entidades y funcionalidades YA existen en el módulo. NO código. En español.\n\n`
    msg += `Módulo: ${moduleLabel}\nTarea que se implementará: ${title || prefillTask?.title || '(sin título)'}\n`
    if (story?.scenarios.length) {
      msg += `Funcionalidad a agregar: `
      story.scenarios.forEach(sc => { msg += `${sc.scenarioTitle}. ` })
      msg += '\n'
    }
    msg += `\nEscribe en 3-5 oraciones qué entidades, servicios y funcionalidades ya existen en el módulo ${moduleLabel} que son relevantes para esta implementación. Sin encabezados.`
    contextMut.mutate([{ role: 'user', content: msg }])
  }

  function handleBuild() {
    setPromptContent(buildPrompt())
    toast({ type: 'success', message: 'Prompt construido' })
  }

  function handleRefineWithAI() {
    const base = promptContent || buildPrompt()
    let userMsg = `Mejora el siguiente prompt de contexto de implementación para Claude Code.\n\n`
    userMsg += `IMPORTANTE: Extrae reglas de negocio precisas y concisas de los escenarios Gherkin. NUNCA generes código Java, TypeScript, SQL ni ninguna implementación.\n\n`

    if (selectedStory?.scenarios.length) {
      userMsg += `Escenarios Gherkin de ${selectedStory.reqId}:\n`
      selectedStory.scenarios.forEach(sc => {
        userMsg += `\nEscenario: ${sc.scenarioTitle}\nDado: ${sc.givenConditions}\nCuando: ${sc.whenEvent}\nEntonces: ${sc.thenOutcome}\n`
      })
      userMsg += '\n'
    }

    userMsg += `Prompt actual:\n${base}`
    refineMut.mutate([{ role: 'user', content: userMsg }])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      title, objective: objective || null, contextInfo: contextInfo || null,
      promptContent, module: module || null, category, linkedTaskId: linkedTaskId || null,
    })
  }

  const isGenerating = refineMut.isPending

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 780 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {prompt ? 'Editar prompt' : 'Nuevo contexto de implementación'}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              Genera contexto para Claude Code — nunca código, solo análisis y reglas de negocio
            </div>
          </div>
          <button type="button" style={closeBtnStyle} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Título */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="ej: Implementar gestión de gastos operativos — RF-021" />
          </div>

          {/* Categoría + Módulo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo de requisito</label>
              <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value as PromptCategory)}>
                {(Object.keys(PROMPT_CAT_LABELS) as PromptCategory[]).map(c => (
                  <option key={c} value={c}>{PROMPT_CAT_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Módulo donde se implementará</label>
              <select style={inputStyle} value={module} onChange={e => setModule(e.target.value)}>
                <option value="">Sin módulo</option>
                {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
              </select>
            </div>
          </div>

          {/* Construcción del contexto */}
          <div style={{ background: '#f8faff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Entradas del contexto
            </div>

            {/* §2 Historia de usuario */}
            <div>
              <label style={labelStyle}>§2 Historia de usuario</label>
              <select
                style={inputStyle}
                value={linkedStoryId}
                onChange={e => setLinkedStoryId(e.target.value)}
              >
                <option value="">Sin historia vinculada</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reqId} — {s.persona ? `Como ${s.persona}...` : s.description?.slice(0, 60) ?? s.reqId}
                  </option>
                ))}
              </select>
              {selectedStory && (
                <div style={{ marginTop: 6, padding: '8px 10px', background: '#eef2ff', borderRadius: 6, fontSize: 12.5, color: '#4338ca', lineHeight: 1.6 }}>
                  <strong>{selectedStory.reqId}</strong>
                  {selectedStory.persona && (
                    <> · Como <strong>{selectedStory.persona}</strong>, quiero {selectedStory.actionStatement}, para {selectedStory.outcomeStatement}.</>
                  )}
                  {selectedStory.scenarios.length > 0 && (
                    <div style={{ marginTop: 5, fontSize: 11.5, color: '#6366f1' }}>
                      {selectedStory.scenarios.length} escenarios Gherkin disponibles → se convertirán en reglas de negocio (§5)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* §3 Objetivo funcional */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={labelStyle}>§3 Objetivo funcional</span>
                <span
                  title="Describe QUÉ debe construirse funcionalmente, sin mencionar código ni tecnologías. Piensa en el beneficio para el usuario final. Ej: 'Implementar el registro de gastos operativos en el módulo Finance, permitiendo al operador crear, listar y eliminar gastos asociados a una cuenta financiera y categoría.'"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%', background: '#e2e8f0',
                    color: '#64748b', fontSize: 9.5, fontWeight: 700, cursor: 'help', flexShrink: 0,
                  }}
                >?</span>
                <button
                  type="button"
                  onClick={generateObjective}
                  disabled={objectiveMut.isPending}
                  style={{
                    marginLeft: 'auto', fontSize: 11, color: '#6366f1', background: 'none',
                    border: '1px solid #c7d2fe', borderRadius: 6, padding: '2px 9px',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    opacity: objectiveMut.isPending ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {objectiveMut.isPending
                    ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Generando...</>
                    : <>✨ Generar con IA</>}
                </button>
              </div>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="Qué se espera construir, sin mencionar código. Ej: Implementar la gestión completa de gastos operativos dentro del módulo Finanzas respetando la arquitectura existente."
              />
            </div>

            {/* §4 Contexto actual */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={labelStyle}>§4 Contexto actual del módulo</span>
                <span
                  title="Describe el estado ACTUAL del módulo ANTES de esta implementación: qué entidades ya existen, qué funcionalidades están implementadas y cuáles faltan. Ej: 'El módulo Finance ya gestiona FinancialAccount y CashMovement. Los pagos a proveedores están implementados en ProcurementPayment. Falta gestionar gastos operativos directos.'"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: '50%', background: '#e2e8f0',
                    color: '#64748b', fontSize: 9.5, fontWeight: 700, cursor: 'help', flexShrink: 0,
                  }}
                >?</span>
                <button
                  type="button"
                  onClick={generateContext}
                  disabled={contextMut.isPending}
                  style={{
                    marginLeft: 'auto', fontSize: 11, color: '#6366f1', background: 'none',
                    border: '1px solid #c7d2fe', borderRadius: 6, padding: '2px 9px',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                    opacity: contextMut.isPending ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {contextMut.isPending
                    ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Generando...</>
                    : <>✨ Generar con IA</>}
                </button>
              </div>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={contextInfo}
                onChange={e => setContextInfo(e.target.value)}
                placeholder="Estado actual del sistema relevante para esta implementación. Ej: El módulo Finance ya tiene cuentas financieras y movimientos. Los pagos a proveedores están implementados."
              />
            </div>

            {/* Secciones automáticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {[
                { n: '§1', label: 'Contexto proyecto', auto: true },
                { n: '§5', label: 'Reglas de negocio', auto: !!selectedStory },
                { n: '§6', label: 'Restricciones', auto: true },
                { n: '§7–9', label: 'Proceso + Política', auto: true },
                { n: '§10', label: 'Resultado esperado', auto: true },
              ].map(s => (
                <div key={s.n} style={{
                  padding: '6px 8px', borderRadius: 6, textAlign: 'center',
                  background: s.auto ? '#d1fae5' : '#fef3c7',
                  border: `1px solid ${s.auto ? '#6ee7b7' : '#fcd34d'}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.auto ? '#059669' : '#92400e' }}>{s.n}</div>
                  <div style={{ fontSize: 10.5, color: s.auto ? '#047857' : '#78350f', marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 9.5, marginTop: 3, color: s.auto ? '#059669' : '#b45309' }}>
                    {s.auto ? '✓ automático' : 'requiere historia'}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{ ...btnPrimaryStyle, background: '#0f766e', flex: 1 }}
                onClick={handleBuild}
              >
                ⚙️ Construir prompt
              </button>
              <button
                type="button"
                style={{
                  ...btnPrimaryStyle, background: '#6366f1', flex: 1,
                  opacity: isGenerating ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                disabled={isGenerating}
                onClick={handleRefineWithAI}
              >
                {isGenerating
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Refinando...</>
                  : <>🤖 Refinar con IA</>
                }
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#6366f1' }}>
              <strong>⚙️ Construir</strong>: ensambla las 10 secciones al instante sin IA · <strong>🤖 Refinar</strong>: mejora las reglas de negocio desde los escenarios Gherkin (no genera código)
            </div>
          </div>

          {/* Prompt result */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Contexto generado para Claude Code *</label>
              {promptContent && (
                <button
                  type="button"
                  style={{ fontSize: 11.5, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => { navigator.clipboard.writeText(promptContent); toast({ type: 'success', message: 'Copiado al portapapeles' }) }}
                >
                  📋 Copiar
                </button>
              )}
            </div>
            <textarea
              style={{
                ...inputStyle, minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 12,
                border: isGenerating ? '1px solid #6366f1' : '1px solid var(--border)',
                transition: 'border 0.2s',
              }}
              value={promptContent}
              onChange={e => setPromptContent(e.target.value)}
              required
              placeholder="Usa '⚙️ Construir prompt' para generar las 10 secciones, luego '🤖 Refinar con IA' para mejorar las reglas de negocio..."
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnPrimaryStyle}>
              {prompt ? 'Guardar cambios' : 'Guardar prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Prompt Detail Modal ──────────────────────────────────────────────────────

function PromptDetailModal({
  prompt, onClose, onStatusChange, onEdit,
}: {
  prompt: PromptPlanDto
  onClose: () => void
  onStatusChange: (status: PromptStatus) => void
  onEdit: () => void
  onRecordExecution: (id: string, rating: number, notes: string) => void
}) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(prompt.effectivenessRating ?? 0)
  const [feedbackNotes, setFeedbackNotes] = useState(prompt.executionNotes ?? '')

  function copyToClipboard() {
    navigator.clipboard.writeText(prompt.promptContent)
    toast({ type: 'success', message: 'Prompt copiado al portapapeles' })
  }

  function handleExecute() {
    navigator.clipboard.writeText(prompt.promptContent)
    toast({ type: 'success', message: 'Prompt copiado — pégalo en Claude Code' })
    onStatusChange('USED')
    setShowFeedback(true)
  }

  function handleFeedbackSubmit() {
    onRecordExecution(prompt.id, rating, feedbackNotes)
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{prompt.title}</h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Badge label={PROMPT_CAT_LABELS[prompt.category]} color={PROMPT_CAT_COLORS[prompt.category]} />
              <Badge label={PROMPT_STATUS_LABELS[prompt.status]} color={PROMPT_STATUS_COLORS[prompt.status]} />
              {prompt.module && <Badge label={MODULE_LABELS[prompt.module] ?? prompt.module} color="#64748b" />}
            </div>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prompt.linkedTaskTitle && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>🔗</span><span>Tarea: <strong>{prompt.linkedTaskTitle}</strong></span>
            </div>
          )}

          {prompt.objective && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Objetivo</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{prompt.objective}</div>
            </div>
          )}

          {prompt.contextInfo && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Contexto</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                {prompt.contextInfo}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Prompt</div>
            <div style={{
              fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.7,
              background: 'var(--bg)', borderRadius: 8, padding: '12px 14px',
              border: '1px solid var(--border)', whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto',
              color: 'var(--text)',
            }}>
              {prompt.promptContent}
            </div>
          </div>

          {/* Feedback de efectividad — visible si ya fue ejecutado */}
          {(prompt.status === 'USED' || showFeedback) && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Trazabilidad de ejecución
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Efectividad del prompt (1 = muy bajo, 5 = excelente)</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setRating(n)}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                        background: rating >= n ? '#16a34a' : 'var(--border)',
                        color: rating >= n ? '#fff' : 'var(--muted)',
                        transition: 'all 0.1s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Detalles que tuve que agregar al prompt</div>
                <textarea
                  value={feedbackNotes}
                  onChange={e => setFeedbackNotes(e.target.value)}
                  placeholder="Ej: Tuve que especificar la migración Flyway V18, aclarar que el status va en PATCH..."
                  style={{ ...inputStyle, minHeight: 64, resize: 'vertical', fontSize: 12.5 }}
                />
              </div>
              {(prompt.effectivenessRating == null || showFeedback) && (
                <button style={btnPrimaryStyle} onClick={handleFeedbackSubmit} disabled={rating === 0}>
                  Guardar trazabilidad
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {prompt.status === 'READY' && (
                <button style={{ ...btnPrimaryStyle, background: '#10b981' }} onClick={handleExecute}>
                  ▶ Ejecutar prompt
                </button>
              )}
              {prompt.status === 'DRAFT' && (
                <button style={{ ...btnSecondaryStyle, color: '#6366f1', borderColor: '#6366f1' }} onClick={() => onStatusChange('READY')}>
                  Marcar listo
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btnSecondaryStyle} onClick={onEdit}>Editar</button>
              <button style={{ ...btnPrimaryStyle, background: '#6366f1' }} onClick={copyToClipboard}>
                📋 Copiar prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task Card (Kanban) ───────────────────────────────────────────────────────

function TaskCard({ task, onMove, onClick, onDragStart, onDragEnd, isDragging, onGeneratePrompt }: {
  task: ProjectTaskDto
  onMove: (id: string, status: TaskStatus) => void
  onClick: (task: ProjectTaskDto) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  isDragging: boolean
  onGeneratePrompt?: (task: ProjectTaskDto) => void
}) {
  const next = NEXT_STATUS[task.status]
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id) }}
      onDragEnd={onDragEnd}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '12px 14px', cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'box-shadow 0.15s, opacity 0.15s',
        marginBottom: 8, opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      onClick={e => { if (!isDragging) onClick(task); e.stopPropagation() }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        <Badge label={TASK_TYPE_LABELS[task.taskType]} color={TASK_TYPE_COLORS[task.taskType]} />
        {task.linkedRequirementId && (
          <Badge label={task.linkedRequirementId} color="#6366f1" bg="#eef2ff" />
        )}
        {task.module && (
          <Badge label={MODULE_LABELS[task.module] ?? task.module} color="#64748b" />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar assignee={task.assignee} />
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: PRIORITY_COLORS[task.priority], flexShrink: 0,
          }} title={PRIORITY_LABELS[task.priority]} />
          {onGeneratePrompt && (
            <button
              onClick={e => { e.stopPropagation(); onGeneratePrompt(task) }}
              title="Generar prompt"
              style={{
                background: 'none', border: '1px solid #c7d2fe', borderRadius: 6,
                padding: '2px 7px', fontSize: 10.5, cursor: 'pointer', color: '#6366f1',
                fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              📝 Prompt
            </button>
          )}
        </div>
        {next && (
          <button
            onClick={e => { e.stopPropagation(); onMove(task.id, next) }}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)',
              fontFamily: 'inherit',
            }}
          >
            → {STATUS_LABELS[next]}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ tasks, sprints }: { tasks: ProjectTaskDto[]; sprints: SprintDto[] }) {
  const activeSprint = sprints.find(s => s.status === 'ACTIVE')
  const sprintTasks = activeSprint ? tasks.filter(t => t.sprintId === activeSprint.id) : []
  const done = sprintTasks.filter(t => t.status === 'DONE').length
  const total = sprintTasks.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const allDone = tasks.filter(t => t.status === 'DONE').length
  const allInProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const allTodo = tasks.filter(t => t.status === 'TODO').length

  const manuelTasks = tasks.filter(t => t.assignee === 'MANUEL')
  const iskianTasks = tasks.filter(t => t.assignee === 'ISKIAN')

  const byModule = MODULES.map(m => ({
    module: m,
    label: MODULE_LABELS[m],
    count: tasks.filter(t => t.module === m).length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Total tareas" value={tasks.length} />
        <KpiCard label="Completadas" value={allDone} color="#10b981" />
        <KpiCard label="En curso" value={allInProgress} color="#f59e0b" />
        <KpiCard label="Por hacer" value={allTodo} />
      </div>

      {activeSprint && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Sprint activo</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{activeSprint.name}</div>
              {activeSprint.goal && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{activeSprint.goal}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{progress}%</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{done} / {total} tareas</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#6366f1', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map(s => (
              <div key={s} style={{ textAlign: 'center', background: STATUS_BG[s], borderRadius: 8, padding: '8px 4px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLORS[s] }}>
                  {sprintTasks.filter(t => t.status === s).length}
                </div>
                <div style={{ fontSize: 10.5, color: STATUS_COLORS[s], fontWeight: 600 }}>{STATUS_LABELS[s]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Por asignado</div>
          {[
            { name: 'Manuel', assignee: 'MANUEL' as TaskAssignee, tasks: manuelTasks, color: '#6366f1' },
            { name: 'Iskian', assignee: 'ISKIAN' as TaskAssignee, tasks: iskianTasks, color: '#10b981' },
          ].map(({ name, assignee, tasks: at, color }) => (
            <div key={assignee} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar assignee={assignee} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {at.filter(t => t.status === 'DONE').length}/{at.length}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: color,
                    width: at.length > 0 ? `${Math.round((at.filter(t => t.status === 'DONE').length / at.length) * 100)}%` : '0%',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Por módulo</div>
          {byModule.slice(0, 6).map(({ module, label, count }) => (
            <div key={module} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 20, padding: '1px 8px' }}>{count}</span>
            </div>
          ))}
          {byModule.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin tareas por módulo</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Board Tab ────────────────────────────────────────────────────────────────

function BoardTab({
  tasks, sprints, onMoveTask, onClickTask, onGeneratePrompt,
}: {
  tasks: ProjectTaskDto[]
  sprints: SprintDto[]
  onMoveTask: (id: string, status: TaskStatus) => void
  onClickTask: (t: ProjectTaskDto) => void
  onGeneratePrompt: (t: ProjectTaskDto) => void
}) {
  const [selectedSprint, setSelectedSprint] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const filtered = tasks.filter(t => {
    const matchSprint = !selectedSprint || t.sprintId === selectedSprint
    const matchAssignee = !selectedAssignee || t.assignee === selectedAssignee
    return matchSprint && matchAssignee
  })

  function handleDrop(status: TaskStatus) {
    if (!draggedId) return
    const task = tasks.find(t => t.id === draggedId)
    if (task && task.status !== status) onMoveTask(draggedId, status)
    setDraggedId(null)
    setDragOverStatus(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select style={{ ...inputStyle, width: 200 }} value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)}>
          <option value="">Todos los sprints</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ ...inputStyle, width: 160 }} value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
          <option value="">Todos</option>
          <option value="MANUEL">Manuel</option>
          <option value="ISKIAN">Iskian</option>
        </select>
        {(selectedSprint || selectedAssignee) && (
          <button style={btnSecondaryStyle} onClick={() => { setSelectedSprint(''); setSelectedAssignee('') }}>
            Limpiar ×
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
        {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map(status => {
          const colTasks = filtered.filter(t => t.status === status)
          const isOver = dragOverStatus === status
          return (
            <div
              key={status}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStatus(status) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null) }}
              onDrop={e => { e.preventDefault(); handleDrop(status) }}
              style={{
                borderRadius: 12,
                outline: isOver ? `2px dashed ${STATUS_COLORS[status]}` : '2px dashed transparent',
                background: isOver ? STATUS_BG[status] : 'transparent',
                transition: 'background 0.15s, outline 0.15s',
                padding: isOver ? '6px' : 0,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                padding: '6px 10px', borderRadius: 8, background: STATUS_BG[status],
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: STATUS_COLORS[status] }}>
                  {STATUS_LABELS[status]}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, background: STATUS_COLORS[status],
                  color: '#fff', borderRadius: 20, padding: '0 6px',
                }}>{colTasks.length}</span>
              </div>
              {colTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onMove={onMoveTask}
                  onClick={onClickTask}
                  onDragStart={setDraggedId}
                  onDragEnd={() => { setDraggedId(null); setDragOverStatus(null) }}
                  isDragging={draggedId === t.id}
                  onGeneratePrompt={onGeneratePrompt}
                />
              ))}
              {colTasks.length === 0 && (
                <div style={{
                  border: `2px dashed ${isOver ? STATUS_COLORS[status] : 'var(--border)'}`,
                  borderRadius: 10, padding: '28px 14px',
                  textAlign: 'center',
                  color: isOver ? STATUS_COLORS[status] : 'var(--muted)',
                  fontSize: 12.5, transition: 'all 0.15s',
                }}>
                  {isOver ? `Soltar aquí` : 'Sin tareas'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({
  tasks, sprints, onStatusChange, onEditTask, onDeleteTask, onClickTask,
}: {
  tasks: ProjectTaskDto[]
  sprints: SprintDto[]
  onStatusChange: (id: string, status: TaskStatus) => void
  onEditTask: (t: ProjectTaskDto) => void
  onDeleteTask: (id: string) => void
  onGeneratePrompt: (t: ProjectTaskDto) => void
  onClickTask: (t: ProjectTaskDto) => void
}) {
  const [filterSprint, setFilterSprint] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = tasks.filter(t =>
    (!filterSprint || t.sprintId === filterSprint) &&
    (!filterAssignee || t.assignee === filterAssignee) &&
    (!filterStatus || t.status === filterStatus) &&
    (!filterType || t.taskType === filterType)
  )

  const hasFilters = filterSprint || filterAssignee || filterStatus || filterType

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...inputStyle, width: 180 }} value={filterSprint} onChange={e => setFilterSprint(e.target.value)}>
          <option value="">Todos los sprints</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ ...inputStyle, width: 140 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
          <option value="">Todos</option>
          <option value="MANUEL">Manuel</option>
          <option value="ISKIAN">Iskian</option>
        </select>
        <select style={{ ...inputStyle, width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select style={{ ...inputStyle, width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {(['DEV', 'QA', 'BUG', 'PLANNING', 'INFRA', 'DESIGN'] as TaskType[]).map(t => (
            <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
          ))}
        </select>
        {hasFilters && (
          <button style={btnSecondaryStyle} onClick={() => { setFilterSprint(''); setFilterAssignee(''); setFilterStatus(''); setFilterType('') }}>
            Limpiar ×
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>
          {filtered.length} tarea{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['Título', 'Tipo', 'Asignado', 'Prior.', 'Sprint', 'Módulo', 'RF/CP', 'Estado', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)', maxWidth: 220 }}>
                  <div
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: '#6366f1' }}
                    onClick={() => onClickTask(t)}
                    title="Ver detalle"
                  >{t.title}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge label={TASK_TYPE_LABELS[t.taskType]} color={TASK_TYPE_COLORS[t.taskType]} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {t.assignee ? <Avatar assignee={t.assignee} /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS[t.priority], display: 'inline-block' }} title={PRIORITY_LABELS[t.priority]} />
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {t.sprintName ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)' }}>
                  {t.module ? MODULE_LABELS[t.module] ?? t.module : '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {t.linkedRequirementId
                    ? <Badge label={t.linkedRequirementId} color="#6366f1" bg="#eef2ff" />
                    : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <select
                    value={t.status}
                    onChange={e => onStatusChange(t.id, e.target.value as TaskStatus)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: 'none',
                      padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
                      background: STATUS_BG[t.status], color: STATUS_COLORS[t.status],
                    }}
                  >
                    {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={iconBtnStyle} onClick={() => onGeneratePrompt(t)} title="Generar prompt">📝</button>
                    <button style={iconBtnStyle} onClick={() => onEditTask(t)} title="Editar">✏️</button>
                    <button style={iconBtnStyle} onClick={() => onDeleteTask(t.id)} title="Eliminar">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No hay tareas que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Prompts Tab ──────────────────────────────────────────────────────────────

function PromptsTab({
  prompts, onCreatePrompt, onEditPrompt, onStatusChange, onDeletePrompt, onOpenAiChat, onRecordExecution,
}: {
  prompts: PromptPlanDto[]
  onCreatePrompt: () => void
  onEditPrompt: (p: PromptPlanDto) => void
  onStatusChange: (id: string, status: PromptStatus) => void
  onDeletePrompt: (id: string) => void
  onOpenAiChat: () => void
  onRecordExecution: (id: string, rating: number, notes: string) => void
}) {
  const [selectedPrompt, setSelectedPrompt] = useState<PromptPlanDto | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const filtered = prompts.filter(p =>
    (!filterStatus || p.status === filterStatus) &&
    (!filterCat || p.category === filterCat)
  )

  return (
    <div>
      {selectedPrompt && (
        <PromptDetailModal
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onStatusChange={(s) => { onStatusChange(selectedPrompt.id, s); setSelectedPrompt(p => p ? { ...p, status: s } : null) }}
          onEdit={() => { onEditPrompt(selectedPrompt); setSelectedPrompt(null) }}
          onRecordExecution={(id, rating, notes) => { onRecordExecution(id, rating, notes); setSelectedPrompt(null) }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <button style={btnPrimaryStyle} onClick={onCreatePrompt}>+ Nuevo prompt</button>
        <button style={{ ...btnSecondaryStyle, color: '#6366f1', borderColor: '#6366f1' }} onClick={onOpenAiChat}>🤖 Asistente IA</button>
        <select style={{ ...inputStyle, width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {(['DRAFT', 'READY', 'USED', 'ARCHIVED'] as PromptStatus[]).map(s => (
            <option key={s} value={s}>{PROMPT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select style={{ ...inputStyle, width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {(Object.keys(PROMPT_CAT_LABELS) as PromptCategory[]).map(c => (
            <option key={c} value={c}>{PROMPT_CAT_LABELS[c]}</option>
          ))}
        </select>
        {(filterStatus || filterCat) && (
          <button style={btnSecondaryStyle} onClick={() => { setFilterStatus(''); setFilterCat('') }}>Limpiar ×</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>
          {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(p => (
          <div key={p.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
            opacity: p.status === 'ARCHIVED' ? 0.5 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</div>
              <button style={iconBtnStyle} onClick={() => onDeletePrompt(p.id)} title="Eliminar">🗑️</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Badge label={PROMPT_CAT_LABELS[p.category]} color={PROMPT_CAT_COLORS[p.category]} />
              <Badge label={PROMPT_STATUS_LABELS[p.status]} color={PROMPT_STATUS_COLORS[p.status]} />
              {p.module && <Badge label={MODULE_LABELS[p.module] ?? p.module} color="#64748b" />}
            </div>

            {p.linkedTaskTitle && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 4 }}>
                <span>🔗</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.linkedTaskTitle}</span>
              </div>
            )}

            <div style={{
              fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace', lineHeight: 1.5,
              background: 'var(--bg)', borderRadius: 6, padding: '8px 10px',
              overflow: 'hidden', maxHeight: 72, display: '-webkit-box',
              WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {p.promptContent}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setSelectedPrompt(p)}>Ver</button>
              {p.status !== 'USED' && p.status !== 'ARCHIVED' && (
                <button
                  style={{ ...btnPrimaryStyle, background: '#6366f1' }}
                  onClick={() => {
                    navigator.clipboard.writeText(p.promptContent)
                    toast({ type: 'success', message: 'Prompt copiado al portapapeles' })
                  }}
                >
                  📋
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No hay prompts planificados</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Crea un prompt para planificar tu próxima instrucción a Claude Code</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── User Story Modal ────────────────────────────────────────────────────────

function EpicModal({
  epic, onClose, onSave, isPending,
}: {
  epic: EpicDto | null
  onClose: () => void
  onSave: (d: EpicRequest) => void
  isPending?: boolean
}) {
  const [code, setCode] = useState(epic?.code ?? '')
  const [name, setName] = useState(epic?.name ?? '')
  const [objective, setObjective] = useState(epic?.objective ?? '')
  const [successCriteria, setSuccessCriteria] = useState(epic?.successCriteria ?? '')
  const [module, setModule] = useState(epic?.module ?? '')
  const [priority, setPriority] = useState<TaskPriority>(epic?.priority ?? 'MEDIUM')
  const [status, setStatus] = useState<EpicStatus>(epic?.status ?? 'PLANNED')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      code: code.trim() || undefined,
      name: name.trim(),
      objective: objective || undefined,
      successCriteria: successCriteria || undefined,
      module: module || undefined,
      priority,
      status,
    })
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {epic ? 'Editar épica' : 'Nueva épica'}
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Código</label>
              <input style={inputStyle} placeholder="EP-01 (auto)" value={code}
                onChange={e => setCode(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} placeholder="Gestión de Proveedores" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Objetivo</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              placeholder="Qué valor de negocio entrega esta épica"
              value={objective} onChange={e => setObjective(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Criterios de éxito</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              placeholder="Condiciones medibles para considerar la épica completada"
              value={successCriteria} onChange={e => setSuccessCriteria(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Módulo</label>
              <select style={inputStyle} value={module} onChange={e => setModule(e.target.value)}>
                <option value="">Sin módulo</option>
                {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as EpicStatus)}>
                {(Object.keys(EPIC_STATUS_LABELS) as EpicStatus[]).map(s => (
                  <option key={s} value={s}>{EPIC_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimaryStyle, opacity: isPending ? 0.7 : 1 }} disabled={isPending}>
              {isPending ? 'Guardando...' : epic ? 'Guardar cambios' : 'Crear épica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── User Story Modal ─────────────────────────────────────────────────────────

function UserStoryModal({
  story, epics, onClose, onSave, isPending,
}: {
  story: UserStoryDto | null
  epics: EpicDto[]
  onClose: () => void
  onSave: (d: UserStoryRequest) => void
  isPending?: boolean
}) {
  const [reqId, setReqId] = useState(story?.reqId ?? '')
  const [epicId, setEpicId] = useState(story?.epicId ?? '')
  const [storyType, setStoryType] = useState<StoryType>(story?.storyType ?? 'FUNCTIONAL')
  const [persona, setPersona] = useState(story?.persona ?? '')
  const [action, setAction] = useState(story?.actionStatement ?? '')
  const [outcome, setOutcome] = useState(story?.outcomeStatement ?? '')
  const [description, setDescription] = useState(story?.description ?? '')
  const [module, setModule] = useState(story?.module ?? '')
  const [priority, setPriority] = useState<string>(story?.priority ?? 'MEDIUM')
  const [status, setStatus] = useState<StoryStatus>(story?.status ?? 'DEFINED')
  const [nfrCat, setNfrCat] = useState<string>(story?.nfrCategory ?? '')
  const [nfrCriterion, setNfrCriterion] = useState(story?.nfrCriterion ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      reqId, epicId: epicId || null, storyType,
      persona: persona || undefined,
      actionStatement: action || undefined,
      outcomeStatement: outcome || undefined,
      description: description || undefined,
      module: module || undefined,
      priority: priority as never,
      status,
      nfrCategory: nfrCat ? nfrCat as NfrCategory : undefined,
      nfrCriterion: nfrCriterion || undefined,
    })
  }

  const isNfr = storyType === 'NON_FUNCTIONAL'

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {story ? 'Editar historia' : 'Nueva historia de usuario'}
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>ID del requisito *</label>
              <input style={inputStyle} placeholder="RF-001" value={reqId}
                onChange={e => setReqId(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={storyType} onChange={e => setStoryType(e.target.value as StoryType)}>
                <option value="FUNCTIONAL">Funcional</option>
                <option value="NON_FUNCTIONAL">No Funcional</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Épica</label>
              <select style={inputStyle} value={epicId} onChange={e => setEpicId(e.target.value)}>
                <option value="">Sin épica</option>
                {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.code} — {ep.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Módulo</label>
              <select style={inputStyle} value={module} onChange={e => setModule(e.target.value)}>
                <option value="">Sin módulo</option>
                {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p as never]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as StoryStatus)}>
                {(Object.keys(STORY_STATUS_LABELS) as StoryStatus[]).map(s => (
                  <option key={s} value={s}>{STORY_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {!isNfr && (
            <>
              <div>
                <label style={labelStyle}>Como... (persona / rol)</label>
                <input style={inputStyle} placeholder="operador de compras" value={persona}
                  onChange={e => setPersona(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Quiero... (acción)</label>
                <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                  placeholder="crear una orden de compra seleccionando proveedor y productos"
                  value={action} onChange={e => setAction(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Para... (resultado esperado)</label>
                <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                  placeholder="registrar el pedido con número correlativo y total calculado"
                  value={outcome} onChange={e => setOutcome(e.target.value)} />
              </div>
            </>
          )}

          {isNfr && (
            <>
              <div>
                <label style={labelStyle}>Categoría RNF</label>
                <select style={inputStyle} value={nfrCat} onChange={e => setNfrCat(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {(Object.keys(NFR_CAT_LABELS) as NfrCategory[]).map(c => (
                    <option key={c} value={c}>{NFR_CAT_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Criterio de aceptación medible</label>
                <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                  placeholder="No existe endpoint PUT/DELETE sobre movimientos. HTTP 405 si se intenta."
                  value={nfrCriterion} onChange={e => setNfrCriterion(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Descripción / notas adicionales</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimaryStyle, opacity: isPending ? 0.7 : 1 }} disabled={isPending}>
              {isPending ? 'Guardando...' : story ? 'Guardar cambios' : 'Crear historia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Scenario Modal ───────────────────────────────────────────────────────────

function ScenarioModal({
  scenario, onClose, onSave,
}: {
  scenario: { id?: string; scenarioTitle?: string; givenConditions?: string; whenEvent?: string; thenOutcome?: string; scenarioType?: ScenarioType; sortOrder?: number } | null
  onClose: () => void
  onSave: (d: StoryScenarioRequest) => void
}) {
  const [title, setTitle] = useState(scenario?.scenarioTitle ?? '')
  const [given, setGiven] = useState(scenario?.givenConditions ?? '')
  const [when, setWhen] = useState(scenario?.whenEvent ?? '')
  const [then, setThen] = useState(scenario?.thenOutcome ?? '')
  const [type, setType] = useState<ScenarioType>(scenario?.scenarioType ?? 'HAPPY_PATH')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ scenarioTitle: title, givenConditions: given, whenEvent: when, thenOutcome: then, scenarioType: type })
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {scenario?.id ? 'Editar escenario' : 'Nuevo escenario Gherkin'}
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Título del escenario *</label>
              <input style={inputStyle} placeholder="Usuario crea proveedor con datos válidos"
                value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={type} onChange={e => setType(e.target.value as ScenarioType)}>
                {(Object.keys(SCENARIO_TYPE_LABELS) as ScenarioType[]).map(t => (
                  <option key={t} value={t}>{SCENARIO_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Dado que... (Given)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              placeholder="el sistema está en línea y el usuario tiene rol SUPERVISOR"
              value={given} onChange={e => setGiven(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Cuando... (When)</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              placeholder="el operador ingresa nombre 'Distribuidora del Mar' y guarda"
              value={when} onChange={e => setWhen(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Entonces... (Then)</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              placeholder="el proveedor se crea con UUID, estado ACTIVE y timestamps registrados"
              value={then} onChange={e => setThen(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose}>Cancelar</button>
            <button type="submit" style={btnPrimaryStyle}>{scenario?.id ? 'Guardar' : 'Agregar escenario'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Story Detail Modal ───────────────────────────────────────────────────────

function StoryDetailModal({
  story, onClose, onEdit, onStatusChange, onAddScenario, onDeleteScenario, onEditScenario,
  tasks, isUpdating, onCreateTask,
}: {
  story: UserStoryDto
  onClose: () => void
  onEdit: () => void
  onStatusChange: (s: StoryStatus) => void
  onAddScenario: () => void
  onDeleteScenario: (id: string) => void
  onEditScenario: (sc: UserStoryDto['scenarios'][0]) => void
  tasks: ProjectTaskDto[]
  isUpdating?: boolean
  onCreateTask: () => void
}) {
  const isNfr = story.storyType === 'NON_FUNCTIONAL'
  const linkedTasks = tasks.filter(t => t.userStoryId === story.id || t.linkedRequirementId === story.reqId)

  const { data: executions = [] } = useQuery({
    queryKey: ['test-executions', story.id],
    queryFn: () => qaApi.listExecutions(story.id),
    enabled: !isNfr,
  })
  const { data: qaHistory = [] } = useQuery({
    queryKey: ['qa-history', story.id],
    queryFn: () => qaApi.storyHistory(story.id),
    enabled: !isNfr,
  })
  const latestByScenario = new Map<string, TestExecutionDto>()
  for (const ex of executions) {
    if (!latestByScenario.has(ex.scenarioId)) latestByScenario.set(ex.scenarioId, ex)
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>
                {story.reqId}
              </span>
              {story.epicName && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {story.epicCode} · {story.epicName}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={isNfr ? 'No Funcional' : 'Funcional'} color={isNfr ? '#8b5cf6' : '#6366f1'} />
              <Badge label={STORY_STATUS_LABELS[story.status]} color={STORY_STATUS_COLORS[story.status]} />
              <Badge label={PRIORITY_LABELS[story.priority]} color={PRIORITY_COLORS[story.priority]} />
              {story.module && <Badge label={MODULE_LABELS[story.module] ?? story.module} color="#64748b" />}
            </div>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* User story format */}
          {!isNfr && (story.persona || story.actionStatement || story.outcomeStatement) && (
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Historia de usuario (formato Mike Cohn)
              </div>
              {story.persona && (
                <div style={{ marginBottom: 6, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Como</span>{' '}
                  <span style={{ fontWeight: 700, color: '#6366f1' }}>{story.persona}</span>,
                </div>
              )}
              {story.actionStatement && (
                <div style={{ marginBottom: 6, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>quiero</span>{' '}
                  {story.actionStatement},
                </div>
              )}
              {story.outcomeStatement && (
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>para</span>{' '}
                  {story.outcomeStatement}.
                </div>
              )}
            </div>
          )}

          {/* NFR criterion */}
          {isNfr && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Requisito no funcional
                </div>
                {story.nfrCategory && (
                  <Badge label={NFR_CAT_LABELS[story.nfrCategory]} color={NFR_CAT_COLORS[story.nfrCategory]} />
                )}
              </div>
              {story.nfrCriterion && (
                <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {story.nfrCriterion}
                </div>
              )}
            </div>
          )}

          {story.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Descripción</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{story.description}</div>
            </div>
          )}

          {/* Gherkin scenarios */}
          {!isNfr && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Escenarios Gherkin ({story.scenarios.length})
                </div>
                <button type="button" style={{ ...btnSecondaryStyle, fontSize: 12, padding: '4px 10px' }} onClick={onAddScenario}>
                  + Escenario
                </button>
              </div>
              {story.scenarios.length === 0 && (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Sin escenarios. Agrega el primero con el botón de arriba.
                </div>
              )}
              {story.scenarios.map(sc => (
                <div key={sc.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{sc.scenarioTitle}</span>
                      <Badge label={SCENARIO_TYPE_LABELS[sc.scenarioType]} color={SCENARIO_TYPE_COLORS[sc.scenarioType]} />
                      {latestByScenario.has(sc.id) && (
                        <Badge
                          label={`QA: ${TEST_RESULT_LABELS[latestByScenario.get(sc.id)!.result]}`}
                          color={TEST_RESULT_COLORS[latestByScenario.get(sc.id)!.result]}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" style={iconBtnStyle} onClick={() => onEditScenario(sc)}>✏️</button>
                      <button type="button" style={iconBtnStyle} onClick={() => onDeleteScenario(sc.id)}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                    <div><span style={{ fontWeight: 700, color: '#6366f1', minWidth: 70, display: 'inline-block' }}>Dado que</span> {sc.givenConditions}</div>
                    <div><span style={{ fontWeight: 700, color: '#f59e0b', minWidth: 70, display: 'inline-block' }}>Cuando</span> {sc.whenEvent}</div>
                    <div><span style={{ fontWeight: 700, color: '#10b981', minWidth: 70, display: 'inline-block' }}>Entonces</span> {sc.thenOutcome}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial de QA */}
          {!isNfr && executions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Historial de pruebas QA ({executions.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {executions.map(ex => (
                  <div key={ex.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Badge label={TEST_RESULT_LABELS[ex.result]} color={TEST_RESULT_COLORS[ex.result]} />
                      <span style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.scenarioTitle}
                      </span>
                      {ex.notes && <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {ex.notes}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {ex.defectTaskTitle && <Badge label="🐞 BUG creado" color="#ef4444" />}
                      <Avatar assignee={ex.executedBy} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {new Date(ex.executedAt).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participación en ciclos de prueba (trazabilidad inversa) */}
          {!isNfr && qaHistory.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Ciclos de prueba en los que participó ({qaHistory.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qaHistory.map(h => (
                  <div key={h.runId} style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '1px 7px', borderRadius: 20 }}>{h.runCode}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{h.runName}</span>
                    {h.buildVersion && <Badge label={h.buildVersion} color="#0ea5e9" />}
                    <Badge label={h.runStatus === 'OPEN' ? 'Abierto' : 'Cerrado'} color={h.runStatus === 'OPEN' ? '#10b981' : '#64748b'} />
                    <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>
                      ✅ {h.results.pass ?? 0} · ❌ {h.results.fail ?? 0} · ⏳ {h.results.pending ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tareas vinculadas */}
          {linkedTasks.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Tareas vinculadas ({linkedTasks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {linkedTasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Avatar assignee={task.assignee} />
                      <span style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <Badge label={TASK_TYPE_LABELS[task.taskType]} color={TASK_TYPE_COLORS[task.taskType]} />
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
                        background: STATUS_BG[task.status], color: STATUS_COLORS[task.status],
                      }}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                style={{ ...btnSecondaryStyle, color: '#6366f1', borderColor: '#6366f1' }}
                onClick={onCreateTask}
              >
                📋 Crear tarea
              </button>
              {story.status !== 'DONE' && (
                <button
                  type="button"
                  style={{ ...btnPrimaryStyle, opacity: isUpdating ? 0.7 : 1 }}
                  disabled={isUpdating}
                  onClick={() => onStatusChange('DONE')}
                >
                  {isUpdating ? 'Guardando...' : '✓ Marcar completada'}
                </button>
              )}
              {(story.status === 'DEFINED' || story.status === 'BLOCKED') && (
                <button
                  type="button"
                  style={{ ...btnSecondaryStyle, color: '#f59e0b', borderColor: '#f59e0b', opacity: isUpdating ? 0.7 : 1 }}
                  disabled={isUpdating}
                  onClick={() => onStatusChange('IN_DEV')}
                >
                  Iniciar desarrollo
                </button>
              )}
              {story.status === 'IN_DEV' && (
                <button
                  type="button"
                  style={{ ...btnSecondaryStyle, color: '#8b5cf6', borderColor: '#8b5cf6', opacity: isUpdating ? 0.7 : 1 }}
                  disabled={isUpdating}
                  onClick={() => onStatusChange('REVIEW')}
                >
                  Poner en revisión
                </button>
              )}
              {!isNfr && (story.status === 'IN_DEV' || story.status === 'REVIEW' || story.status === 'QA_FAILED') && (
                <button
                  type="button"
                  style={{ ...btnSecondaryStyle, color: '#06b6d4', borderColor: '#06b6d4', opacity: isUpdating ? 0.7 : 1 }}
                  disabled={isUpdating}
                  onClick={() => onStatusChange('READY_FOR_QA')}
                >
                  🧪 Enviar a QA
                </button>
              )}
            </div>
            <button type="button" style={btnSecondaryStyle} onClick={onEdit}>Editar historia</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI Chat Modal ────────────────────────────────────────────────────────────

function AiChatModal({ onClose, onUseAsPrompt }: {
  onClose: () => void
  onUseAsPrompt: (content: string) => void
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [input, setInput] = useState('')

  const sendMut = useMutation({
    mutationFn: (msgs: AiChatMessage[]) => aiApi.generate(msgs),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    },
    onError: () => toast({ type: 'error', message: 'Error al comunicarse con la IA' }),
  })

  function handleSend() {
    const text = input.trim()
    if (!text || sendMut.isPending) return
    const newMessages: AiChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    sendMut.mutate(newMessages)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 680, display: 'flex', flexDirection: 'column', height: '80vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Asistente IA — Generador de prompts</h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
              Describe qué necesitas implementar y la IA te ayudará a generar un prompt estructurado para Claude Code.
            </div>
          </div>
          <button type="button" style={closeBtnStyle} onClick={onClose}>×</button>
        </div>

        {/* Conversation */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 4 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Hola, soy tu asistente de Sapiens ERP</div>
              <div style={{ fontSize: 12.5 }}>Cuéntame qué quieres implementar y generaré un prompt listo para Claude Code.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                fontFamily: m.role === 'assistant' ? 'monospace' : 'inherit',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {sendMut.isPending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--muted)', fontSize: 13,
              }}>
                Generando respuesta...
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lastAssistant && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{ ...btnPrimaryStyle, background: '#6366f1', fontSize: 12 }}
                onClick={() => onUseAsPrompt(lastAssistant.content)}
              >
                📋 Usar como prompt
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              style={{ ...inputStyle, minHeight: 68, resize: 'none', flex: 1 }}
              placeholder="Describe qué quieres implementar... (Enter para enviar, Shift+Enter para nueva línea)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendMut.isPending}
            />
            <button
              type="button"
              style={{ ...btnPrimaryStyle, alignSelf: 'flex-end', opacity: sendMut.isPending || !input.trim() ? 0.6 : 1 }}
              disabled={sendMut.isPending || !input.trim()}
              onClick={handleSend}
            >
              {sendMut.isPending ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Requirements Tab ─────────────────────────────────────────────────────────

function RequirementsTab({
  stories, tasks, epics, onCreateStory, onEditStory, onStatusChange, onDeleteStory,
  onAddScenario, onEditScenario, onDeleteScenario, isUpdatingStatus, onCreateTask,
  onCreateEpic, onEditEpic, onDeleteEpic,
}: {
  stories: UserStoryDto[]
  tasks: ProjectTaskDto[]
  epics: EpicDto[]
  onCreateStory: () => void
  onEditStory: (s: UserStoryDto) => void
  onStatusChange: (id: string, status: StoryStatus) => void
  onDeleteStory: (id: string) => void
  onAddScenario: (storyId: string) => void
  onEditScenario: (storyId: string, sc: UserStoryDto['scenarios'][0]) => void
  onDeleteScenario: (storyId: string, scenarioId: string) => void
  isUpdatingStatus?: boolean
  onCreateTask: (s: UserStoryDto) => void
  onCreateEpic: () => void
  onEditEpic: (e: EpicDto) => void
  onDeleteEpic: (id: string) => void
}) {
  const [filterType, setFilterType] = useState<string>('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedStory, setSelectedStory] = useState<UserStoryDto | null>(null)

  const filtered = stories.filter(s =>
    (!filterType || s.storyType === filterType) &&
    (!filterModule || s.module === filterModule) &&
    (!filterStatus || s.status === filterStatus)
  )

  const functional = filtered.filter(s => s.storyType === 'FUNCTIONAL')
  const nfr = filtered.filter(s => s.storyType === 'NON_FUNCTIONAL')

  // Historias funcionales agrupadas por épica (entidad)
  const byEpicId = functional.reduce<Record<string, UserStoryDto[]>>((acc, s) => {
    const key = s.epicId ?? '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const orphanStories = byEpicId['__none__'] ?? []

  const hasFilters = filterType || filterModule || filterStatus

  return (
    <div>
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          tasks={tasks}
          isUpdating={isUpdatingStatus}
          onClose={() => setSelectedStory(null)}
          onEdit={() => { onEditStory(selectedStory); setSelectedStory(null) }}
          onStatusChange={s => onStatusChange(selectedStory.id, s)}
          onAddScenario={() => onAddScenario(selectedStory.id)}
          onDeleteScenario={scId => onDeleteScenario(selectedStory.id, scId)}
          onEditScenario={sc => onEditScenario(selectedStory.id, sc)}
          onCreateTask={() => { onCreateTask(selectedStory); setSelectedStory(null) }}
        />
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...btnPrimaryStyle, background: '#6366f1' }} onClick={onCreateEpic}>+ Nueva épica</button>
        <button style={btnPrimaryStyle} onClick={onCreateStory}>+ Nueva historia</button>
        <select style={{ ...inputStyle, width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="FUNCTIONAL">Funcionales (RF)</option>
          <option value="NON_FUNCTIONAL">No funcionales (RNF)</option>
        </select>
        <select style={{ ...inputStyle, width: 160 }} value={filterModule} onChange={e => setFilterModule(e.target.value)}>
          <option value="">Todos los módulos</option>
          {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
        </select>
        <select style={{ ...inputStyle, width: 170 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {(Object.keys(STORY_STATUS_LABELS) as StoryStatus[]).map(s => (
            <option key={s} value={s}>{STORY_STATUS_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <button style={btnSecondaryStyle} onClick={() => { setFilterType(''); setFilterModule(''); setFilterStatus('') }}>
            Limpiar ×
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>
          {filtered.length} requisito{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 24 }}>
        {(['DEFINED', 'IN_DEV', 'REVIEW', 'READY_FOR_QA', 'IN_QA', 'QA_FAILED', 'DONE', 'BLOCKED'] as StoryStatus[]).map(s => (
          <div key={s} style={{
            background: 'var(--surface)', border: `1px solid ${STORY_STATUS_COLORS[s]}33`,
            borderRadius: 10, padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STORY_STATUS_COLORS[s] }}>
              {stories.filter(st => st.status === s).length}
            </div>
            <div style={{ fontSize: 11, color: STORY_STATUS_COLORS[s], fontWeight: 600, marginTop: 2 }}>
              {STORY_STATUS_LABELS[s]}
            </div>
          </div>
        ))}
      </div>

      {/* Functional stories grouped by epic */}
      {(filterType === '' || filterType === 'FUNCTIONAL') && (epics.length > 0 || functional.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
            Épicas e Historias de Usuario — Requisitos Funcionales
          </div>
          {[...epics.map(ep => ({ epic: ep as EpicDto | null, stories: byEpicId[ep.id] ?? [] })),
            ...(orphanStories.length > 0 ? [{ epic: null as EpicDto | null, stories: orphanStories }] : [])]
            .filter(g => g.epic !== null || g.stories.length > 0)
            .filter(g => !hasFilters || g.stories.length > 0)
            .map(({ epic, stories: epicStories }) => (
            <div key={epic?.id ?? '__none__'} style={{ marginBottom: 20 }}>
              {epic ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${EPIC_STATUS_COLORS[epic.status]}`,
                  borderRadius: 10, padding: '12px 16px', marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{epic.code}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{epic.name}</span>
                  <Badge label={EPIC_STATUS_LABELS[epic.status]} color={EPIC_STATUS_COLORS[epic.status]} />
                  <Badge label={PRIORITY_LABELS[epic.priority]} color={PRIORITY_COLORS[epic.priority]} />
                  {epic.module && <Badge label={MODULE_LABELS[epic.module] ?? epic.module} color="#64748b" />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <div style={{ width: 120, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${epic.totalStories > 0 ? Math.round((epic.doneStories / epic.totalStories) * 100) : 0}%`,
                        height: '100%', background: '#10b981', transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {epic.doneStories}/{epic.totalStories} historias
                    </span>
                    <button style={iconBtnStyle} title="Editar épica" onClick={() => onEditEpic(epic)}>✏️</button>
                    <button style={iconBtnStyle} title="Eliminar épica" onClick={() => onDeleteEpic(epic.id)}>🗑️</button>
                  </div>
                  {epic.objective && (
                    <div style={{ width: '100%', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      🎯 {epic.objective}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 2 }}>
                  Sin épica
                </div>
              )}
              {epic && epicStories.length === 0 && (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                  Sin historias en esta épica todavía
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {epicStories.map(s => (
                  <div key={s.id}
                    onClick={() => setSelectedStory(s)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                      padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{s.reqId}</span>
                        <Badge label={STORY_STATUS_LABELS[s.status]} color={STORY_STATUS_COLORS[s.status]} />
                      </div>
                      <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onDeleteStory(s.id) }}>🗑️</button>
                    </div>

                    {/* Mike Cohn format */}
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 12 }}>
                      {s.persona && <><span style={{ color: 'var(--muted)', fontWeight: 600 }}>Como</span>{' '}<span style={{ fontWeight: 600, color: '#6366f1' }}>{s.persona}</span>,{' '}</>}
                      {s.actionStatement && <><span style={{ color: 'var(--muted)', fontWeight: 600 }}>quiero</span>{' '}{s.actionStatement},{' '}</>}
                      {s.outcomeStatement && <><span style={{ color: 'var(--muted)', fontWeight: 600 }}>para</span>{' '}{s.outcomeStatement}.</>}
                      {!s.persona && !s.actionStatement && !s.outcomeStatement && s.description && (
                        <span style={{ color: 'var(--muted)' }}>{s.description.slice(0, 120)}{s.description.length > 120 ? '…' : ''}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Badge label={PRIORITY_LABELS[s.priority]} color={PRIORITY_COLORS[s.priority]} />
                        {s.module && <Badge label={MODULE_LABELS[s.module] ?? s.module} color="#64748b" />}
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {s.scenarios.length} escenario{s.scenarios.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NFR table */}
      {(filterType === '' || filterType === 'NON_FUNCTIONAL') && nfr.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: '#8b5cf6', borderRadius: 2, display: 'inline-block' }} />
            Requisitos No Funcionales
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['ID', 'Categoría', 'Descripción', 'Criterio de aceptación', 'Prior.', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nfr.map((s, i) => (
                  <tr key={s.id}
                    style={{ borderBottom: i < nfr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onClick={() => setSelectedStory(s)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: '#faf5ff', padding: '2px 8px', borderRadius: 20 }}>{s.reqId}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {s.nfrCategory
                        ? <Badge label={NFR_CAT_LABELS[s.nfrCategory]} color={NFR_CAT_COLORS[s.nfrCategory]} />
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text)', maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description ?? '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--muted)', maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nfrCriterion ?? '—'}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS[s.priority], display: 'inline-block' }} title={PRIORITY_LABELS[s.priority]} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Badge label={STORY_STATUS_LABELS[s.status]} color={STORY_STATUS_COLORS[s.status]} />
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onDeleteStory(s.id) }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin requisitos</div>
          <div style={{ fontSize: 13 }}>Crea el primero con el botón "+ Nueva historia"</div>
        </div>
      )}
    </div>
  )
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab() {
  const qc = useQueryClient()
  const { data: ctx, isLoading } = useQuery({
    queryKey: ['ai-context'],
    queryFn: aiApi.getContext,
  })

  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Sync content when data loads
  useState(() => { if (ctx) setContent(ctx.content) })

  const saveMut = useMutation({
    mutationFn: (c: string) => aiApi.updateContext(c),
    onSuccess: (updated: AiContextDto) => {
      setContent(updated.content)
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['ai-context'] })
      toast({ type: 'success', message: 'Contexto guardado correctamente' })
    },
    onError: () => toast({ type: 'error', message: 'Error al guardar el contexto' }),
  })

  // Initialize content from query
  if (ctx && content === '' && !isDirty) {
    setContent(ctx.content)
  }

  function handleChange(val: string) {
    setContent(val)
    setIsDirty(true)
  }

  function handleReset() {
    if (ctx) { setContent(ctx.content); setIsDirty(false) }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const charCount = content.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Contexto del Asistente IA
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              Este documento define el conocimiento base que recibe el asistente al generar prompts.
              Puedes editarlo para agregar contexto del proyecto, reglas de negocio, arquitectura actualizada
              o cualquier información que mejore la calidad de los prompts generados.
            </div>
            {ctx?.updatedAt && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Última actualización: {new Date(ctx.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: '📐', title: 'Arquitectura', desc: 'Describe la estructura de carpetas, capas y patrones usados' },
          { icon: '⚡', title: 'Invariantes', desc: 'Lista las reglas de negocio que nunca deben violarse' },
          { icon: '📦', title: 'Módulos', desc: 'Documenta qué hace cada módulo y sus dependencias' },
        ].map(tip => (
          <div key={tip.title} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{tip.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{tip.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{tip.desc}</div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {ctx?.label ?? 'Contexto base del Asistente IA'}
            </span>
            {isDirty && (
              <span style={{
                fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e',
                borderRadius: 20, padding: '1px 8px',
              }}>Sin guardar</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} palabras
            </span>
            <button
              type="button"
              style={{ fontSize: 11.5, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => { navigator.clipboard.writeText(content); toast({ type: 'success', message: 'Copiado al portapapeles' }) }}
            >
              📋 Copiar
            </button>
          </div>
        </div>

        {/* Textarea */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Cargando contexto...
          </div>
        ) : (
          <textarea
            style={{
              width: '100%', minHeight: 520, padding: '18px 20px',
              border: 'none', outline: 'none', resize: 'vertical',
              fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
              color: 'var(--text)', background: 'var(--surface)',
              boxSizing: 'border-box',
            }}
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Describe el proyecto, arquitectura, invariantes, módulos..."
            spellCheck={false}
          />
        )}

        {/* Footer actions */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
          padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          {isDirty && (
            <button type="button" style={btnSecondaryStyle} onClick={handleReset}>
              Descartar cambios
            </button>
          )}
          <button
            type="button"
            style={{ ...btnPrimaryStyle, background: '#6366f1', opacity: saveMut.isPending ? 0.7 : 1 }}
            disabled={saveMut.isPending || !isDirty}
            onClick={() => saveMut.mutate(content)}
          >
            {saveMut.isPending ? 'Guardando...' : '💾 Guardar contexto'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '14px 18px', fontSize: 13, color: '#166534', lineHeight: 1.6,
      }}>
        <strong>¿Cómo se usa este contexto?</strong> Cada vez que haces click en "🤖 Generar prompt con IA"
        en el formulario de Nuevo Prompt, este documento se envía automáticamente al asistente
        como base de conocimiento del proyecto. Mantenerlo actualizado mejora la calidad y precisión
        de los prompts generados.
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: ProjectTaskDto | null; prefill?: { storyId?: string; module: string; title?: string } }>({ open: false, task: null })
  const [epicModal, setEpicModal] = useState<{ open: boolean; epic: EpicDto | null }>({ open: false, epic: null })
  const [taskDetail, setTaskDetail] = useState<ProjectTaskDto | null>(null)
  const [promptModal, setPromptModal] = useState<{ open: boolean; prompt: PromptPlanDto | null; prefill?: { linkedTaskId: string }; prefillTask?: ProjectTaskDto; prefillStory?: UserStoryDto }>({ open: false, prompt: null })
  const [storyModal, setStoryModal] = useState<{ open: boolean; story: UserStoryDto | null }>({ open: false, story: null })
  const [scenarioModal, setScenarioModal] = useState<{ open: boolean; storyId: string; scenario: UserStoryDto['scenarios'][0] | null } | null>(null)
  const [aiChatOpen, setAiChatOpen] = useState(false)

  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: sprintsApi.listAll })
  const { data: tasks = [] } = useQuery({ queryKey: ['project-tasks'], queryFn: () => projectTasksApi.listFiltered() })
  const { data: prompts = [] } = useQuery({ queryKey: ['prompt-plans'], queryFn: promptPlansApi.listAll })
  const { data: stories = [] } = useQuery({ queryKey: ['user-stories'], queryFn: () => userStoriesApi.listFiltered() })
  const { data: epics = [] } = useQuery({ queryKey: ['epics'], queryFn: epicsApi.listAll })

  const createEpicMut = useMutation({
    mutationFn: (d: EpicRequest) => epicsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epics'] }); setEpicModal({ open: false, epic: null }); toast({ type: 'success', message: 'Épica creada' }) },
    onError: () => toast({ type: 'error', message: 'Error al crear épica' }),
  })
  const updateEpicMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EpicRequest }) => epicsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['user-stories'] })
      setEpicModal({ open: false, epic: null })
      toast({ type: 'success', message: 'Épica actualizada' })
    },
    onError: () => toast({ type: 'error', message: 'Error al actualizar épica' }),
  })
  const deleteEpicMut = useMutation({
    mutationFn: (id: string) => epicsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['user-stories'] })
      toast({ type: 'success', message: 'Épica eliminada (las historias quedan sin épica)' })
    },
    onError: () => toast({ type: 'error', message: 'Error al eliminar épica' }),
  })

  const createSprintMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => sprintsApi.create(d as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sprints'] }); setShowSprintModal(false); toast({ type: 'success', message: 'Sprint creado' }) },
    onError: () => toast({ type: 'error', message: 'Error al crear sprint' }),
  })

  const createTaskMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => projectTasksApi.create(d as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-tasks'] }); setTaskModal({ open: false, task: null }); toast({ type: 'success', message: 'Tarea creada' }) },
    onError: () => toast({ type: 'error', message: 'Error al crear tarea' }),
  })

  const updateTaskMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => projectTasksApi.update(id, data as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-tasks'] }); setTaskModal({ open: false, task: null }); toast({ type: 'success', message: 'Tarea actualizada' }) },
    onError: () => toast({ type: 'error', message: 'Error al actualizar tarea' }),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => projectTasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks'] }),
    onError: () => toast({ type: 'error', message: 'Error al cambiar estado' }),
  })

  const deleteTaskMut = useMutation({
    mutationFn: (id: string) => projectTasksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-tasks'] }); toast({ type: 'success', message: 'Tarea eliminada' }) },
    onError: () => toast({ type: 'error', message: 'Error al eliminar tarea' }),
  })

  const createPromptMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => promptPlansApi.create(d as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-plans'] }); setPromptModal({ open: false, prompt: null }); toast({ type: 'success', message: 'Prompt creado' }) },
    onError: () => toast({ type: 'error', message: 'Error al crear prompt' }),
  })

  const updatePromptMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => promptPlansApi.update(id, data as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-plans'] }); setPromptModal({ open: false, prompt: null }); toast({ type: 'success', message: 'Prompt actualizado' }) },
    onError: () => toast({ type: 'error', message: 'Error al actualizar prompt' }),
  })

  const promptStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PromptStatus }) => promptPlansApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt-plans'] }),
    onError: () => toast({ type: 'error', message: 'Error al cambiar estado del prompt' }),
  })

  const deletePromptMut = useMutation({
    mutationFn: (id: string) => promptPlansApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-plans'] }); toast({ type: 'success', message: 'Prompt eliminado' }) },
    onError: () => toast({ type: 'error', message: 'Error al eliminar prompt' }),
  })

  const recordExecutionMut = useMutation({
    mutationFn: ({ id, rating, notes }: { id: string; rating: number; notes: string }) =>
      promptPlansApi.recordExecution(id, rating, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-plans'] }); toast({ type: 'success', message: 'Trazabilidad guardada' }) },
    onError: () => toast({ type: 'error', message: 'Error al guardar trazabilidad' }),
  })

  const createStoryMut = useMutation({
    mutationFn: (d: UserStoryRequest) => userStoriesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); setStoryModal({ open: false, story: null }); toast({ type: 'success', message: 'Historia creada' }) },
    onError: () => toast({ type: 'error', message: 'Error al crear historia' }),
  })
  const updateStoryMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserStoryRequest }) => userStoriesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); setStoryModal({ open: false, story: null }); toast({ type: 'success', message: 'Historia actualizada' }) },
    onError: () => toast({ type: 'error', message: 'Error al actualizar historia' }),
  })
  const storyStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StoryStatus }) => userStoriesApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-stories'] })
      toast({ type: 'success', message: 'Estado actualizado' })
    },
    onError: () => toast({ type: 'error', message: 'Error al cambiar estado' }),
  })
  const deleteStoryMut = useMutation({
    mutationFn: (id: string) => userStoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); toast({ type: 'success', message: 'Historia eliminada' }) },
    onError: () => toast({ type: 'error', message: 'Error al eliminar historia' }),
  })
  const addScenarioMut = useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: StoryScenarioRequest }) => userStoriesApi.addScenario(storyId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); setScenarioModal(null); toast({ type: 'success', message: 'Escenario agregado' }) },
    onError: () => toast({ type: 'error', message: 'Error al agregar escenario' }),
  })
  const updateScenarioMut = useMutation({
    mutationFn: ({ scenarioId, data }: { scenarioId: string; data: StoryScenarioRequest }) => userStoriesApi.updateScenario(scenarioId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); setScenarioModal(null); toast({ type: 'success', message: 'Escenario actualizado' }) },
    onError: () => toast({ type: 'error', message: 'Error al actualizar escenario' }),
  })
  const deleteScenarioMut = useMutation({
    mutationFn: (scenarioId: string) => userStoriesApi.deleteScenario(scenarioId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-stories'] }); toast({ type: 'success', message: 'Escenario eliminado' }) },
    onError: () => toast({ type: 'error', message: 'Error al eliminar escenario' }),
  })

  function handleStorySave(data: UserStoryRequest) {
    if (storyModal.story) {
      updateStoryMut.mutate({ id: storyModal.story.id, data })
    } else {
      createStoryMut.mutate(data)
    }
  }

  function handleEpicSave(data: EpicRequest) {
    if (epicModal.epic) {
      updateEpicMut.mutate({ id: epicModal.epic.id, data })
    } else {
      createEpicMut.mutate(data)
    }
  }

  function handleTaskSave(data: Record<string, unknown>) {
    if (taskModal.task) {
      updateTaskMut.mutate({ id: taskModal.task.id, data })
    } else {
      createTaskMut.mutate(data)
    }
  }

  function handlePromptSave(data: Record<string, unknown>) {
    if (promptModal.prompt) {
      updatePromptMut.mutate({ id: promptModal.prompt.id, data })
    } else {
      createPromptMut.mutate(data)
    }
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'board', label: 'Tablero', icon: '🗂️' },
    { key: 'tasks', label: 'Tareas', icon: '✅' },
    { key: 'requirements', label: 'Requisitos', icon: '📋' },
    { key: 'qa', label: 'QA', icon: '🧪' },
    { key: 'prompts', label: 'Prompts', icon: '💬' },
    { key: 'config', label: 'Configuración IA', icon: '⚙️' },
  ]

  return (
    <div style={{ padding: '28px 32px', animation: 'fadeUp 0.25s ease', maxWidth: 1400 }}>
      {showSprintModal && (
        <SprintModal
          onClose={() => setShowSprintModal(false)}
          onSave={d => createSprintMut.mutate(d)}
        />
      )}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          sprints={sprints}
          stories={stories}
          prefill={taskModal.prefill}
          onClose={() => setTaskModal({ open: false, task: null })}
          onSave={handleTaskSave}
        />
      )}
      {epicModal.open && (
        <EpicModal
          epic={epicModal.epic}
          onClose={() => setEpicModal({ open: false, epic: null })}
          onSave={handleEpicSave}
          isPending={createEpicMut.isPending || updateEpicMut.isPending}
        />
      )}
      {taskDetail && (
        <TaskDetailModal
          task={taskDetail}
          stories={stories}
          prompts={prompts}
          onClose={() => setTaskDetail(null)}
          onEdit={() => { setTaskModal({ open: true, task: taskDetail }); setTaskDetail(null) }}
          onGeneratePrompt={() => {
            const story = stories.find(s => s.reqId === taskDetail.linkedRequirementId)
            setPromptModal({ open: true, prompt: null, prefill: { linkedTaskId: taskDetail.id }, prefillTask: taskDetail, prefillStory: story })
            setTaskDetail(null)
          }}
          onStatusChange={status => { updateStatusMut.mutate({ id: taskDetail.id, status }); setTaskDetail(d => d ? { ...d, status } : null) }}
        />
      )}
      {storyModal.open && (
        <UserStoryModal
          story={storyModal.story}
          epics={epics}
          onClose={() => setStoryModal({ open: false, story: null })}
          onSave={handleStorySave}
          isPending={createStoryMut.isPending || updateStoryMut.isPending}
        />
      )}
      {scenarioModal && (
        <ScenarioModal
          scenario={scenarioModal.scenario}
          onClose={() => setScenarioModal(null)}
          onSave={data => {
            if (scenarioModal.scenario?.id) {
              updateScenarioMut.mutate({ scenarioId: scenarioModal.scenario.id, data })
            } else {
              addScenarioMut.mutate({ storyId: scenarioModal.storyId, data })
            }
          }}
        />
      )}
      {promptModal.open && (
        <PromptModal
          prompt={promptModal.prompt}
          stories={stories}
          initialLinkedTaskId={promptModal.prefill?.linkedTaskId}
          prefillTask={promptModal.prefillTask}
          prefillStory={promptModal.prefillStory}
          onClose={() => setPromptModal({ open: false, prompt: null })}
          onSave={handlePromptSave}
        />
      )}
      {aiChatOpen && (
        <AiChatModal
          onClose={() => setAiChatOpen(false)}
          onUseAsPrompt={content => {
            navigator.clipboard.writeText(content)
            toast({ type: 'success', message: 'Respuesta copiada al portapapeles' })
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: tab === t.key ? 700 : 500,
                background: tab === t.key ? 'var(--accent-weak)' : 'transparent',
                color: tab === t.key ? 'var(--accent-text)' : 'var(--muted)',
                transition: 'all 0.12s',
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondaryStyle} onClick={() => setShowSprintModal(true)}>+ Nuevo sprint</button>
          <button style={btnPrimaryStyle} onClick={() => setTaskModal({ open: true, task: null })}>+ Nueva tarea</button>
          {tab === 'prompts' && (
            <button style={{ ...btnPrimaryStyle, background: '#6366f1' }} onClick={() => setPromptModal({ open: true, prompt: null })}>+ Nuevo prompt</button>
          )}
        </div>
      </div>

      {/* Sprints strip */}
      {sprints.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {sprints.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              background: s.status === 'ACTIVE' ? '#eef2ff' : 'var(--surface)',
              border: `1px solid ${s.status === 'ACTIVE' ? '#6366f1' : 'var(--border)'}`,
              borderRadius: 20, padding: '4px 12px', fontSize: 12.5,
              color: s.status === 'ACTIVE' ? '#6366f1' : 'var(--muted)',
              fontWeight: s.status === 'ACTIVE' ? 700 : 500,
            }}>
              {s.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />}
              {s.name}
              {s.endDate && (
                <span style={{ fontSize: 11, opacity: 0.7 }}>→ {new Date(s.endDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab tasks={tasks} sprints={sprints} />}
      {tab === 'board' && (
        <BoardTab
          tasks={tasks} sprints={sprints}
          onMoveTask={(id, status) => updateStatusMut.mutate({ id, status })}
          onClickTask={t => setTaskDetail(t)}
          onGeneratePrompt={t => setPromptModal({ open: true, prompt: null, prefill: { linkedTaskId: t.id } })}
        />
      )}
      {tab === 'tasks' && (
        <TasksTab
          tasks={tasks} sprints={sprints}
          onStatusChange={(id, status) => updateStatusMut.mutate({ id, status })}
          onClickTask={t => setTaskDetail(t)}
          onEditTask={t => setTaskModal({ open: true, task: t })}
          onDeleteTask={id => deleteTaskMut.mutate(id)}
          onGeneratePrompt={t => setPromptModal({ open: true, prompt: null, prefill: { linkedTaskId: t.id } })}
        />
      )}
      {tab === 'requirements' && (
        <RequirementsTab
          stories={stories}
          tasks={tasks}
          epics={epics}
          isUpdatingStatus={storyStatusMut.isPending}
          onCreateStory={() => setStoryModal({ open: true, story: null })}
          onEditStory={s => setStoryModal({ open: true, story: s })}
          onStatusChange={(id, status) => storyStatusMut.mutate({ id, status })}
          onDeleteStory={id => deleteStoryMut.mutate(id)}
          onAddScenario={storyId => setScenarioModal({ open: true, storyId, scenario: null })}
          onEditScenario={(storyId, sc) => setScenarioModal({ open: true, storyId, scenario: sc })}
          onDeleteScenario={(_storyId, scenarioId) => deleteScenarioMut.mutate(scenarioId)}
          onCreateTask={s => setTaskModal({
            open: true, task: null,
            prefill: { storyId: s.id, module: s.module ?? '', title: `[${s.reqId}] Implementar` },
          })}
          onCreateEpic={() => setEpicModal({ open: true, epic: null })}
          onEditEpic={e => setEpicModal({ open: true, epic: e })}
          onDeleteEpic={id => deleteEpicMut.mutate(id)}
        />
      )}
      {tab === 'qa' && (
        <QaTab
          stories={stories}
          epics={epics}
          isUpdating={storyStatusMut.isPending}
          onSendToQa={id => storyStatusMut.mutate({ id, status: 'READY_FOR_QA' })}
        />
      )}
      {tab === 'config' && <ConfigTab />}
      {tab === 'prompts' && (
        <PromptsTab
          prompts={prompts}
          onCreatePrompt={() => setPromptModal({ open: true, prompt: null })}
          onEditPrompt={p => setPromptModal({ open: true, prompt: p })}
          onStatusChange={(id, status) => promptStatusMut.mutate({ id, status })}
          onDeletePrompt={id => deletePromptMut.mutate(id)}
          onOpenAiChat={() => setAiChatOpen(true)}
          onRecordExecution={(id, rating, notes) => recordExecutionMut.mutate({ id, rating, notes })}
        />
      )}
    </div>
  )
}
