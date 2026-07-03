import type {
  TaskType, TaskStatus, TaskAssignee, TaskPriority,
  PromptCategory, PromptStatus,
  StoryStatus, NfrCategory, ScenarioType,
  EpicStatus, TestResult, RunType, RunStatus, RunEnvironment,
} from '../api/projectApi'

// ─── Constantes de dominio ────────────────────────────────────────────────────

export const MODULES = ['catalog', 'inventory', 'procurement', 'finance', 'identity', 'reports', 'project']
export const MODULE_LABELS: Record<string, string> = {
  catalog: 'Catálogo', inventory: 'Inventario', procurement: 'Compras',
  finance: 'Finanzas', identity: 'Identidad', reports: 'Reportes', project: 'Proyecto',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  DEV: 'Desarrollo', QA: 'QA', BUG: 'Bug', PLANNING: 'Planificación', INFRA: 'Infraestructura', DESIGN: 'Diseño',
}
export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  DEV: '#6366f1', QA: '#10b981', BUG: '#ef4444', PLANNING: '#f59e0b', INFRA: '#64748b', DESIGN: '#ec4899',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Por hacer', IN_PROGRESS: 'En curso', REVIEW: 'En revisión', DONE: 'Completado',
}
export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#64748b', IN_PROGRESS: '#f59e0b', REVIEW: '#8b5cf6', DONE: '#10b981',
}
export const STATUS_BG: Record<TaskStatus, string> = {
  TODO: '#f1f5f9', IN_PROGRESS: '#fef3c7', REVIEW: '#ede9fe', DONE: '#d1fae5',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
}
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#7c3aed',
}

export const PROMPT_CAT_LABELS: Record<PromptCategory, string> = {
  NEW_FEATURE: 'Nueva función', BUG_FIX: 'Bug fix', REFACTOR: 'Refactoring',
  DOCUMENTATION: 'Documentación', TESTING: 'Testing', DATABASE: 'Base de datos',
  CONFIGURATION: 'Configuración',
}
export const PROMPT_CAT_COLORS: Record<PromptCategory, string> = {
  NEW_FEATURE: '#6366f1', BUG_FIX: '#ef4444', REFACTOR: '#f59e0b',
  DOCUMENTATION: '#06b6d4', TESTING: '#10b981', DATABASE: '#8b5cf6', CONFIGURATION: '#64748b',
}

export const PROMPT_STATUS_LABELS: Record<PromptStatus, string> = {
  DRAFT: 'Borrador', READY: 'Listo', USED: 'Utilizado', ARCHIVED: 'Archivado',
}
export const PROMPT_STATUS_COLORS: Record<PromptStatus, string> = {
  DRAFT: '#94a3b8', READY: '#6366f1', USED: '#10b981', ARCHIVED: '#cbd5e1',
}

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  DEFINED: 'Definida', IN_DEV: 'En desarrollo', REVIEW: 'En revisión',
  READY_FOR_QA: 'Lista para QA', IN_QA: 'En QA', QA_FAILED: 'QA fallido',
  DONE: 'Completada', BLOCKED: 'Bloqueada',
}
export const STORY_STATUS_COLORS: Record<StoryStatus, string> = {
  DEFINED: '#64748b', IN_DEV: '#f59e0b', REVIEW: '#8b5cf6',
  READY_FOR_QA: '#06b6d4', IN_QA: '#0ea5e9', QA_FAILED: '#f43f5e',
  DONE: '#10b981', BLOCKED: '#ef4444',
}

export const EPIC_STATUS_LABELS: Record<EpicStatus, string> = {
  PLANNED: 'Planificada', IN_PROGRESS: 'En progreso', DONE: 'Completada', ON_HOLD: 'En pausa',
}
export const EPIC_STATUS_COLORS: Record<EpicStatus, string> = {
  PLANNED: '#64748b', IN_PROGRESS: '#f59e0b', DONE: '#10b981', ON_HOLD: '#8b5cf6',
}

export const TEST_RESULT_LABELS: Record<TestResult, string> = {
  PASS: 'Aprobado', FAIL: 'Fallido', BLOCKED: 'Bloqueado', SKIPPED: 'Omitido',
}
export const TEST_RESULT_COLORS: Record<TestResult, string> = {
  PASS: '#10b981', FAIL: '#ef4444', BLOCKED: '#f59e0b', SKIPPED: '#94a3b8',
}

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  FEATURE: 'Funcional', REGRESSION: 'Regresión', SMOKE: 'Smoke', HOTFIX: 'Hotfix',
}
export const RUN_TYPE_COLORS: Record<RunType, string> = {
  FEATURE: '#6366f1', REGRESSION: '#8b5cf6', SMOKE: '#f59e0b', HOTFIX: '#ef4444',
}
export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  OPEN: 'Abierto', CLOSED: 'Cerrado',
}
export const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  OPEN: '#10b981', CLOSED: '#64748b',
}
export const RUN_ENV_LABELS: Record<RunEnvironment, string> = {
  LOCAL: 'Local', QA: 'QA', STAGING: 'Staging', PROD: 'Producción',
}

export const NFR_CAT_LABELS: Record<NfrCategory, string> = {
  DATA_INTEGRITY: 'Integridad de datos', CONSISTENCY: 'Consistencia',
  BUSINESS_RULES: 'Reglas de negocio', SECURITY: 'Seguridad',
  PERFORMANCE: 'Rendimiento', USABILITY: 'Usabilidad', COMPLIANCE: 'Cumplimiento',
}
export const NFR_CAT_COLORS: Record<NfrCategory, string> = {
  DATA_INTEGRITY: '#6366f1', CONSISTENCY: '#8b5cf6', BUSINESS_RULES: '#f59e0b',
  SECURITY: '#ef4444', PERFORMANCE: '#06b6d4', USABILITY: '#10b981', COMPLIANCE: '#64748b',
}

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  HAPPY_PATH: 'Camino feliz', NEGATIVE: 'Negativo', EDGE: 'Caso límite',
}
export const SCENARIO_TYPE_COLORS: Record<ScenarioType, string> = {
  HAPPY_PATH: '#10b981', NEGATIVE: '#ef4444', EDGE: '#f59e0b',
}

export const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function initials(assignee: TaskAssignee | null) {
  return assignee === 'MANUEL' ? 'M' : assignee === 'ISKIAN' ? 'I' : '?'
}
export function assigneeColor(assignee: TaskAssignee | null) {
  return assignee === 'MANUEL' ? '#6366f1' : assignee === 'ISKIAN' ? '#10b981' : '#94a3b8'
}

// ─── Componentes base ─────────────────────────────────────────────────────────

export function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, lineHeight: 1.6,
      color, background: bg || color + '1a',
    }}>{label}</span>
  )
}

export function Avatar({ assignee }: { assignee: TaskAssignee | null }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: assigneeColor(assignee),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 11, fontWeight: 700,
    }}>{initials(assignee)}</span>
  )
}

export function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

export const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 20,
}

export const modalStyle: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 16,
  padding: '24px 28px', width: '100%',
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}

export const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: 20,
}

export const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
  color: 'var(--muted)', lineHeight: 1, padding: '0 4px', flexShrink: 0,
}

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export const btnPrimaryStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}

export const btnSecondaryStyle: React.CSSProperties = {
  background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 16px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}

export const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, padding: '3px 5px', borderRadius: 6,
  opacity: 0.65, transition: 'opacity 0.12s',
}
