import type { ProjectTaskDto, SprintDto, TaskStatus, TaskAssignee } from '../api/projectApi'
import {
  Avatar, KpiCard,
  STATUS_LABELS, STATUS_COLORS, STATUS_BG,
  MODULES, MODULE_LABELS,
} from './shared'

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

export function DashboardTab({ tasks, sprints }: { tasks: ProjectTaskDto[]; sprints: SprintDto[] }) {
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

