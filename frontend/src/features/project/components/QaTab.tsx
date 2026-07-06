import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  qaApi, qaRunsApi,
  type UserStoryDto, type EpicDto, type TestResult, type TestExecutionDto,
  type TestExecutionRequest, type QaTestRunDto, type QaRunTreeScenario,
  type RunType, type RunEnvironment, type StoryStatus, type QaAttachmentDto,
} from '../api/projectApi'
import { toast } from '../../../shared/toast'
import {
  Badge, Avatar,
  STORY_STATUS_LABELS, STORY_STATUS_COLORS,
  SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS,
  TEST_RESULT_LABELS, TEST_RESULT_COLORS,
  RUN_TYPE_LABELS, RUN_TYPE_COLORS, RUN_STATUS_LABELS, RUN_STATUS_COLORS, RUN_ENV_LABELS,
  overlayStyle, modalStyle, modalHeaderStyle, closeBtnStyle, labelStyle, inputStyle,
  btnPrimaryStyle, btnSecondaryStyle,
} from './shared'

// ─── Evidencia adjunta ────────────────────────────────────────────────────────

export function AttachmentThumb({ att }: { att: QaAttachmentDto }) {
  const { data: blob } = useQuery({
    queryKey: ['qa-attachment', att.id],
    queryFn: () => qaApi.getAttachmentBlob(att.id),
    staleTime: Infinity,
    refetchOnMount: false,   // blob de imagen: cacheado para siempre, no re-descargar al montar
  })
  const url = blob ? URL.createObjectURL(blob) : null
  const isImage = att.contentType.startsWith('image/')

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title={att.fileName}>
        <img src={url} alt={att.fileName}
          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
      </a>
    )
  }
  return (
    <a href={url ?? '#'} target="_blank" rel="noreferrer" title={att.fileName}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6366f1', textDecoration: 'none' }}>
      📄 {att.fileName}
    </a>
  )
}

// ─── Barra de ejecución (notas + evidencia + crear BUG + botones) ─────────────

function ExecuteBar({ onRecord, isPending, defectTitle }: {
  onRecord: (req: TestExecutionRequest, file: File | null) => void
  isPending: boolean
  defectTitle: string
}) {
  const [notes, setNotes] = useState('')
  const [createDefect, setCreateDefect] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function record(result: TestResult) {
    onRecord({
      result,
      executedBy: 'ISKIAN',
      notes: notes || undefined,
      createDefect: result === 'FAIL' ? createDefect : false,
      defectTitle: result === 'FAIL' && createDefect ? defectTitle : undefined,
      defectAssignee: result === 'FAIL' && createDefect ? 'MANUEL' : undefined,
    }, file)
    setNotes('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        placeholder="Notas / evidencia de la ejecución"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" style={{ display: 'none' }}
        onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button type="button" title="Adjuntar captura o PDF (máx 5MB)"
        onClick={() => fileRef.current?.click()}
        style={{ ...btnSecondaryStyle, padding: '6px 10px', fontSize: 12, color: file ? '#10b981' : 'var(--muted)' }}>
        {file ? `📎 ${file.name.slice(0, 18)}${file.name.length > 18 ? '…' : ''}` : '📎 Evidencia'}
      </button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
        <input type="checkbox" checked={createDefect} onChange={e => setCreateDefect(e.target.checked)} />
        Crear BUG si falla
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button disabled={isPending} onClick={() => record('PASS')}
          style={{ ...btnSecondaryStyle, padding: '6px 12px', fontSize: 12, color: '#10b981', borderColor: '#10b981', opacity: isPending ? 0.6 : 1 }}>
          ✓ Pasa
        </button>
        <button disabled={isPending} onClick={() => record('FAIL')}
          style={{ ...btnSecondaryStyle, padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444', opacity: isPending ? 0.6 : 1 }}>
          ✗ Falla
        </button>
        <button disabled={isPending} onClick={() => record('BLOCKED')}
          style={{ ...btnSecondaryStyle, padding: '6px 12px', fontSize: 12, color: '#f59e0b', borderColor: '#f59e0b', opacity: isPending ? 0.6 : 1 }}>
          ⊘ Bloqueado
        </button>
      </div>
    </div>
  )
}

function GherkinLines({ given, when, then }: { given: string; when: string; then: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
      <div><span style={{ fontWeight: 700, color: '#6366f1' }}>Dado que</span> {given}</div>
      <div><span style={{ fontWeight: 700, color: '#f59e0b' }}>Cuando</span> {when}</div>
      <div><span style={{ fontWeight: 700, color: '#10b981' }}>Entonces</span> {then}</div>
    </div>
  )
}

// ─── Ejecución suelta por historia (ciclo READY_FOR_QA → DONE) ────────────────

function QaScenarioRow({ story, scenario, latest, onRecord, isPending }: {
  story: UserStoryDto
  scenario: UserStoryDto['scenarios'][0]
  latest: TestExecutionDto | undefined
  onRecord: (scenarioId: string, req: TestExecutionRequest, file: File | null) => void
  isPending: boolean
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{scenario.scenarioTitle}</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>v{scenario.version}</span>
          <Badge label={SCENARIO_TYPE_LABELS[scenario.scenarioType]} color={SCENARIO_TYPE_COLORS[scenario.scenarioType]} />
          {scenario.tags.map(t => <Badge key={t} label={`#${t}`} color="#64748b" />)}
          {latest
            ? <Badge label={`Último: ${TEST_RESULT_LABELS[latest.result]}`} color={TEST_RESULT_COLORS[latest.result]} />
            : <Badge label="Sin ejecutar" color="#94a3b8" />}
        </div>
      </div>
      <GherkinLines given={scenario.givenConditions} when={scenario.whenEvent} then={scenario.thenOutcome} />
      {latest && latest.attachments.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Evidencia:</span>
          {latest.attachments.map(a => <AttachmentThumb key={a.id} att={a} />)}
        </div>
      )}
      <ExecuteBar
        isPending={isPending}
        defectTitle={`BUG ${story.reqId} — ${scenario.scenarioTitle}`}
        onRecord={(req, file) => onRecord(scenario.id, req, file)}
      />
    </div>
  )
}

function QaStoryPanel({ story }: { story: UserStoryDto }) {
  const qc = useQueryClient()
  const { data: executions = [] } = useQuery({
    queryKey: ['test-executions', story.id],
    queryFn: () => qaApi.listExecutions(story.id),
  })
  const latestByScenario = new Map<string, TestExecutionDto>()
  for (const ex of executions) {
    if (!latestByScenario.has(ex.scenarioId)) latestByScenario.set(ex.scenarioId, ex)
  }

  const recordMut = useMutation({
    mutationFn: async ({ scenarioId, req, file }: { scenarioId: string; req: TestExecutionRequest; file: File | null }) => {
      const res = await qaApi.recordExecution(story.id, scenarioId, req)
      if (file) await qaApi.uploadAttachment(res.id, file)
      return res
    },
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['test-executions', story.id] })
      qc.invalidateQueries({ queryKey: ['user-stories'] })
      qc.invalidateQueries({ queryKey: ['project-tasks'] })
      qc.invalidateQueries({ queryKey: ['qa-coverage'] })
      const statusLabel = STORY_STATUS_LABELS[res.storyStatusAfter]
      toast({
        type: res.result === 'PASS' ? 'success' : 'info',
        message: `Resultado registrado: ${TEST_RESULT_LABELS[res.result]} · Historia → ${statusLabel}${res.defectTaskId ? ' · BUG creado' : ''}`,
      })
    },
    onError: () => toast({ type: 'error', message: 'Error al registrar la ejecución' }),
  })

  const activeScenarios = story.scenarios.filter(sc => sc.isActive)
  const passed = activeScenarios.filter(sc => latestByScenario.get(sc.id)?.result === 'PASS').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
      {activeScenarios.length === 0 ? (
        <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Esta historia no tiene criterios de aceptación (escenarios Gherkin) activos.
          Agrégalos en la pestaña Requisitos antes de probar.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            Criterios de aceptación: {passed}/{activeScenarios.length} aprobados
          </div>
          {activeScenarios.map(sc => (
            <QaScenarioRow
              key={sc.id}
              story={story}
              scenario={sc}
              latest={latestByScenario.get(sc.id)}
              onRecord={(scenarioId, req, file) => recordMut.mutate({ scenarioId, req, file })}
              isPending={recordMut.isPending}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ─── Widget de cobertura ──────────────────────────────────────────────────────

function CoverageWidget() {
  const [expanded, setExpanded] = useState(false)
  const { data: coverage } = useQuery({ queryKey: ['qa-coverage'], queryFn: () => qaRunsApi.coverage() })

  if (!coverage) return null
  const t = coverage.totals
  const warn = t.neverExecuted > 0

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '14px 18px', marginBottom: 20,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>📐 Cobertura de QA</span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {t.coveredScenarios}/{t.totalScenarios} criterios cubiertos
        </span>
        <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
          {t.passingScenarios} en verde
        </span>
        {warn && (
          <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
            {t.neverExecuted} sin prueba ⚠️
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coverage.epics.map(ep => (
            <div key={ep.epicId ?? 'none'} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {ep.epicCode && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 7px', borderRadius: 20 }}>{ep.epicCode}</span>}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{ep.epicName}</span>
                <div style={{ width: 90, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${ep.coveragePct}%`, height: '100%', background: '#06b6d4' }} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {ep.coveragePct}% cubierto · {ep.greenPct}% en verde ({ep.coveredScenarios}/{ep.totalScenarios})
                </span>
              </div>
              {ep.stories.filter(s => s.neverExecuted.length > 0).map(s => (
                <div key={s.storyId} style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 8, lineHeight: 1.8 }}>
                  ⚠️ <b style={{ color: '#6366f1' }}>{s.reqId}</b> — sin prueba: {s.neverExecuted.map(n => n.title).join(' · ')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal: nuevo ciclo de prueba ─────────────────────────────────────────────

function NewRunModal({ epics, stories, onClose, onSave, isPending }: {
  epics: EpicDto[]
  stories: UserStoryDto[]
  onClose: () => void
  onSave: (d: Parameters<typeof qaRunsApi.create>[0]) => void
  isPending: boolean
}) {
  const [name, setName] = useState('')
  const [runType, setRunType] = useState<RunType>('REGRESSION')
  const [buildVersion, setBuildVersion] = useState('')
  const [environment, setEnvironment] = useState<RunEnvironment>('QA')
  const [scopeType, setScopeType] = useState<'TAG' | 'EPIC' | 'STORIES'>('TAG')
  const [tag, setTag] = useState('regression')
  const [epicId, setEpicId] = useState('')
  const [storyIds, setStoryIds] = useState<string[]>([])

  const candidates = stories.filter(s => s.scenarios.some(sc => sc.isActive))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      name: name.trim(),
      runType,
      buildVersion: buildVersion.trim() || undefined,
      environment,
      openedBy: 'ISKIAN',
      scope: scopeType === 'TAG'
        ? { type: 'TAG', tag: tag.trim() }
        : scopeType === 'EPIC'
          ? { type: 'EPIC', epicId }
          : { type: 'STORIES', storyIds },
    })
  }

  const scopeValid = scopeType === 'TAG' ? tag.trim() !== '' : scopeType === 'EPIC' ? epicId !== '' : storyIds.length > 0

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Nuevo ciclo de prueba</h3>
          <button style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} placeholder="Regresión sprint 2" value={name}
              onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={runType} onChange={e => setRunType(e.target.value as RunType)}>
                {(Object.keys(RUN_TYPE_LABELS) as RunType[]).map(t => (
                  <option key={t} value={t}>{RUN_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Build</label>
              <input style={inputStyle} placeholder="v1.4.0" value={buildVersion}
                onChange={e => setBuildVersion(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Ambiente</label>
              <select style={inputStyle} value={environment} onChange={e => setEnvironment(e.target.value as RunEnvironment)}>
                {(Object.keys(RUN_ENV_LABELS) as RunEnvironment[]).map(en => (
                  <option key={en} value={en}>{RUN_ENV_LABELS[en]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Alcance (suite dinámica)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {([['TAG', '🏷 Por tag'], ['EPIC', '📦 Por épica'], ['STORIES', '📋 Por historias']] as const).map(([k, l]) => (
                <button key={k} type="button"
                  onClick={() => setScopeType(k)}
                  style={{
                    ...btnSecondaryStyle, padding: '6px 12px', fontSize: 12,
                    background: scopeType === k ? 'var(--accent-weak)' : 'var(--surface)',
                    color: scopeType === k ? 'var(--accent-text)' : 'var(--text)',
                    fontWeight: scopeType === k ? 700 : 500,
                  }}>
                  {l}
                </button>
              ))}
            </div>
            {scopeType === 'TAG' && (
              <input style={inputStyle} placeholder="regression" value={tag} onChange={e => setTag(e.target.value)} />
            )}
            {scopeType === 'EPIC' && (
              <select style={inputStyle} value={epicId} onChange={e => setEpicId(e.target.value)}>
                <option value="">Selecciona una épica</option>
                {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.code} — {ep.name}</option>)}
              </select>
            )}
            {scopeType === 'STORIES' && (
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {candidates.map(s => (
                  <label key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, cursor: 'pointer', color: 'var(--text)' }}>
                    <input type="checkbox" checked={storyIds.includes(s.id)}
                      onChange={e => setStoryIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} />
                    <b style={{ color: '#6366f1' }}>{s.reqId}</b> {(s.actionStatement ?? '').slice(0, 60)}
                  </label>
                ))}
                {candidates.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No hay historias con escenarios activos</span>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnSecondaryStyle} onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" style={{ ...btnPrimaryStyle, opacity: isPending || !scopeValid ? 0.6 : 1 }}
              disabled={isPending || !scopeValid}>
              {isPending ? 'Creando...' : 'Crear ciclo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Escenario dentro del árbol del run ──────────────────────────────────────

function RunScenarioNode({ runId, runOpen, storyId, reqId, scenario }: {
  runId: string
  runOpen: boolean
  storyId: string
  reqId: string
  scenario: QaRunTreeScenario
}) {
  const qc = useQueryClient()
  const [showExecute, setShowExecute] = useState(false)
  const last = scenario.executions[0]

  const recordMut = useMutation({
    mutationFn: async ({ req, file }: { req: TestExecutionRequest; file: File | null }) => {
      const res = await qaApi.recordExecution(storyId, scenario.scenarioId, { ...req, testRunId: runId })
      if (file) await qaApi.uploadAttachment(res.id, file)
      return res
    },
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['qa-run-tree', runId] })
      qc.invalidateQueries({ queryKey: ['qa-runs'] })
      qc.invalidateQueries({ queryKey: ['user-stories'] })
      qc.invalidateQueries({ queryKey: ['project-tasks'] })
      qc.invalidateQueries({ queryKey: ['test-executions', storyId] })
      qc.invalidateQueries({ queryKey: ['qa-coverage'] })
      toast({
        type: res.result === 'PASS' ? 'success' : 'info',
        message: `${TEST_RESULT_LABELS[res.result]} registrado en el run${res.defectTaskId ? ' · BUG creado' : ''}`,
      })
      setShowExecute(false)
    },
    onError: () => toast({ type: 'error', message: 'Error al registrar en el run' }),
  })

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
      background: scenario.pending ? '#fffbeb' : 'var(--bg)', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {scenario.pending
          ? <span title="Pendiente">⏳</span>
          : last?.result === 'PASS' ? <span>✅</span>
          : last?.result === 'FAIL' ? <span>❌</span>
          : last?.result === 'BLOCKED' ? <span>🚫</span>
          : <span>⊘</span>}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{scenario.title}</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>v{scenario.version}</span>
        {scenario.tags.map(t => <Badge key={t} label={`#${t}`} color="#64748b" />)}
        {last && (
          <>
            <Badge label={TEST_RESULT_LABELS[last.result]} color={TEST_RESULT_COLORS[last.result]} />
            {last.defectTaskTitle && <Badge label="🐞 BUG" color="#ef4444" />}
            <Avatar assignee={last.executedBy} />
          </>
        )}
        {scenario.pending && <Badge label="Pendiente" color="#f59e0b" />}
        {runOpen && (
          <button style={{ ...btnSecondaryStyle, marginLeft: 'auto', padding: '4px 10px', fontSize: 11.5 }}
            onClick={() => setShowExecute(!showExecute)}>
            {showExecute ? 'Ocultar' : '▶ Ejecutar'}
          </button>
        )}
      </div>
      {showExecute && (
        <div style={{ marginTop: 10 }}>
          <GherkinLines given={scenario.givenConditions} when={scenario.whenEvent} then={scenario.thenOutcome} />
          <ExecuteBar
            isPending={recordMut.isPending}
            defectTitle={`BUG ${reqId} — ${scenario.title}`}
            onRecord={(req, file) => recordMut.mutate({ req, file })}
          />
        </div>
      )}
      {last?.notes && !showExecute && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, paddingLeft: 22 }}>— {last.notes}</div>
      )}
      {last && last.attachments.length > 0 && !showExecute && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, paddingLeft: 22, flexWrap: 'wrap' }}>
          {last.attachments.map(a => <AttachmentThumb key={a.id} att={a} />)}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de run (expandible → árbol) ─────────────────────────────────────

function RunCard({ run }: { run: QaTestRunDto }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const { data: tree } = useQuery({
    queryKey: ['qa-run-tree', run.id],
    queryFn: () => qaRunsApi.tree(run.id),
    enabled: expanded,
  })

  const closeMut = useMutation({
    mutationFn: () => qaRunsApi.close(run.id),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['qa-runs'] })
      qc.invalidateQueries({ queryKey: ['qa-run-tree', run.id] })
      const s = res.summary ?? {}
      toast({ type: 'success', message: `Ciclo ${res.code} cerrado: ${s.passed ?? 0} ✅ · ${s.failed ?? 0} ❌ · ${s.pending ?? 0} pendientes` })
    },
    onError: () => toast({ type: 'error', message: 'Error al cerrar el ciclo' }),
  })

  const deleteMut = useMutation({
    mutationFn: () => qaRunsApi.delete(run.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-runs'] })
      toast({ type: 'success', message: `Ciclo ${run.code} eliminado (las ejecuciones se conservan)` })
    },
    onError: () => toast({ type: 'error', message: 'Error al eliminar el ciclo' }),
  })

  const s = run.summary

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${RUN_TYPE_COLORS[run.runType]}`,
      borderRadius: 12, padding: '13px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>{run.code}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{run.name}</span>
        <Badge label={RUN_TYPE_LABELS[run.runType]} color={RUN_TYPE_COLORS[run.runType]} />
        <Badge label={RUN_STATUS_LABELS[run.status]} color={RUN_STATUS_COLORS[run.status]} />
        {run.buildVersion && <Badge label={run.buildVersion} color="#0ea5e9" />}
        {run.environment && <Badge label={RUN_ENV_LABELS[run.environment]} color="#64748b" />}
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {run.totalItems} escenario{run.totalItems !== 1 ? 's' : ''}
        </span>
        {s && (
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            ✅ {s.passed ?? 0} · ❌ {s.failed ?? 0} · 🚫 {s.blocked ?? 0} · ⏳ {s.pending ?? 0}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {run.status === 'OPEN' && (
            <button
              style={{ ...btnSecondaryStyle, padding: '4px 12px', fontSize: 11.5, color: '#64748b' }}
              disabled={closeMut.isPending}
              onClick={e => { e.stopPropagation(); closeMut.mutate() }}>
              {closeMut.isPending ? 'Cerrando…' : '🔒 Cerrar ciclo'}
            </button>
          )}
          <button
            title="Eliminar ciclo"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.6 }}
            disabled={deleteMut.isPending}
            onClick={e => { e.stopPropagation(); deleteMut.mutate() }}>
            🗑️
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && tree && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tree.epics.map(ep => (
            <div key={ep.epicId ?? 'none'}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {ep.epicCode ? `${ep.epicCode} · ` : ''}{ep.epicName}
              </div>
              {ep.stories.map(st => (
                <div key={st.storyId} style={{ paddingLeft: 10, borderLeft: '2px solid var(--border)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 7px', borderRadius: 20 }}>{st.reqId}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{st.title}</span>
                    <Badge label={STORY_STATUS_LABELS[st.status]} color={STORY_STATUS_COLORS[st.status]} />
                  </div>
                  {st.scenarios.map(sc => (
                    <RunScenarioNode key={sc.scenarioId} runId={run.id} runOpen={run.status === 'OPEN'}
                      storyId={st.storyId} reqId={st.reqId} scenario={sc} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pestaña QA ───────────────────────────────────────────────────────────────

export function QaTab({ stories, epics, onStatusChange, isUpdating }: {
  stories: UserStoryDto[]
  epics: EpicDto[]
  onStatusChange: (id: string, status: StoryStatus) => void
  isUpdating?: boolean
}) {
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewRun, setShowNewRun] = useState(false)

  const { data: runs = [] } = useQuery({ queryKey: ['qa-runs'], queryFn: () => qaRunsApi.list() })

  const createRunMut = useMutation({
    mutationFn: qaRunsApi.create,
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['qa-runs'] })
      setShowNewRun(false)
      toast({ type: 'success', message: `Ciclo ${res.code} creado con ${res.totalItems} escenarios` })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ type: 'error', message: msg ?? 'Error al crear el ciclo' })
    },
  })

  // RNF incluidas: con escenarios NFR_CHECK recorren el mismo ciclo de QA
  const inQaCycle = stories.filter(s => ['READY_FOR_QA', 'IN_QA', 'QA_FAILED'].includes(s.status))
  const pendingDev = stories.filter(s => ['IN_DEV', 'REVIEW'].includes(s.status))
  const doneCount = stories.filter(s => s.status === 'DONE').length

  return (
    <div>
      {showNewRun && (
        <NewRunModal
          epics={epics}
          stories={stories}
          onClose={() => setShowNewRun(false)}
          onSave={d => createRunMut.mutate(d)}
          isPending={createRunMut.isPending}
        />
      )}

      <CoverageWidget />

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {([['READY_FOR_QA', 'Listas para QA'], ['IN_QA', 'En QA'], ['QA_FAILED', 'QA fallido']] as [StoryStatus, string][]).map(([st, label]) => (
          <div key={st} style={{
            background: 'var(--surface)', border: `1px solid ${STORY_STATUS_COLORS[st]}33`,
            borderRadius: 10, padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STORY_STATUS_COLORS[st] }}>
              {stories.filter(s => s.status === st).length}
            </div>
            <div style={{ fontSize: 11, color: STORY_STATUS_COLORS[st], fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
        <div style={{
          background: 'var(--surface)', border: '1px solid #10b98133',
          borderRadius: 10, padding: '12px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{doneCount}</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>Completadas</div>
        </div>
      </div>

      {/* Ciclos de prueba */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 4, height: 16, background: '#8b5cf6', borderRadius: 2, display: 'inline-block' }} />
          Ciclos de prueba
        </div>
        <button style={{ ...btnPrimaryStyle, background: '#8b5cf6', padding: '6px 14px', fontSize: 12.5 }}
          onClick={() => setShowNewRun(true)}>
          + Nuevo ciclo
        </button>
      </div>
      {runs.length === 0 ? (
        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
          Sin ciclos de prueba. Crea uno de regresión con alcance por tag, épica o historias.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {runs.map(r => <RunCard key={r.id} run={r} />)}
        </div>
      )}

      {/* Ciclo de QA por historia */}
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 16, background: '#06b6d4', borderRadius: 2, display: 'inline-block' }} />
        Historias en ciclo de QA
      </div>
      {inQaCycle.length === 0 && (
        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
          🧪 No hay historias en QA. Envía una historia a QA desde Requisitos o desde la lista de abajo.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {inQaCycle.map(s => (
          <div key={s.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `4px solid ${STORY_STATUS_COLORS[s.status]}`,
            borderRadius: 12, padding: '14px 18px',
          }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }}
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{s.reqId}</span>
              <Badge label={STORY_STATUS_LABELS[s.status]} color={STORY_STATUS_COLORS[s.status]} />
              {s.epicCode && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.epicCode}</span>}
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 200 }}>
                {s.actionStatement ?? s.description ?? s.reqId}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {s.scenarios.length} escenario{s.scenarios.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{expandedId === s.id ? '▲' : '▼'}</span>
            </div>
            {expandedId === s.id && <QaStoryPanel story={s} />}
          </div>
        ))}
      </div>

      {/* Pendientes de enviar a QA */}
      {pendingDev.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
            En desarrollo / revisión — aún no enviadas a QA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingDev.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{s.reqId}</span>
                  <Badge label={STORY_STATUS_LABELS[s.status]} color={STORY_STATUS_COLORS[s.status]} />
                  <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.actionStatement ?? s.description ?? ''}
                  </span>
                </div>
                {s.status === 'IN_DEV' ? (
                  <button
                    style={{ ...btnSecondaryStyle, color: '#8b5cf6', borderColor: '#8b5cf6', padding: '6px 12px', fontSize: 12, opacity: isUpdating ? 0.6 : 1 }}
                    disabled={isUpdating}
                    onClick={() => onStatusChange(s.id, 'REVIEW')}
                  >
                    Poner en revisión
                  </button>
                ) : (
                  <button
                    style={{ ...btnSecondaryStyle, color: '#06b6d4', borderColor: '#06b6d4', padding: '6px 12px', fontSize: 12, opacity: isUpdating ? 0.6 : 1 }}
                    disabled={isUpdating}
                    onClick={() => onStatusChange(s.id, 'READY_FOR_QA')}
                  >
                    🧪 Enviar a QA
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
