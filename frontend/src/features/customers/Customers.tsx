import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, KpiCard, PrimaryBtn, GhostBtn,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import {
  customersApi,
  type CustomerListItemDto, type CustomerSegment, type DocumentType, type CustomerUpsertRequest,
} from './api/customersApi'
import { CustomerDetail } from './CustomerDetail'

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  NEW: 'Nuevo', RECURRING: 'Recurrente', AT_RISK: 'En riesgo', INACTIVE: 'Inactivo',
}
const SEGMENT_COLORS: Record<CustomerSegment, { bg: string; color: string }> = {
  NEW: { bg: 'color-mix(in srgb, #2563eb 14%, transparent)', color: '#2563eb' },
  RECURRING: { bg: 'var(--pos-bg)', color: 'var(--pos)' },
  AT_RISK: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
  INACTIVE: { bg: 'var(--bg)', color: 'var(--muted)' },
}
export const DOC_LABELS: Record<DocumentType, string> = {
  NIT: 'NIT', CC: 'C.C.', CE: 'C.E.', PASSPORT: 'Pasaporte',
}

export function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const c = SEGMENT_COLORS[segment]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 100,
      fontSize: 12, fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {SEGMENT_LABELS[segment]}
    </span>
  )
}

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelSm: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4,
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modalBox: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto',
}

// ─── Formulario de cliente (crear / editar) ──────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CustomerFormModal({ initial, onClose, onSaved }: {
  initial?: CustomerListItemDto & { address?: string | null; notes?: string | null }
  onClose: () => void
  onSaved?: (c: CustomerListItemDto) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CustomerUpsertRequest>({
    name: initial?.name ?? '',
    documentType: initial?.documentType ?? null,
    documentNumber: initial?.documentNumber ?? '',
    legalName: initial?.legalName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    defaultPaymentTermDays: initial?.defaultPaymentTermDays ?? null,
    notes: initial?.notes ?? '',
  })
  const set = (k: keyof CustomerUpsertRequest, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const emailInvalid = !!form.email && !EMAIL_RE.test(form.email)
  const docIncomplete = (!!form.documentType) !== (!!form.documentNumber?.trim())
  const valid = form.name.trim().length > 0 && !emailInvalid && !docIncomplete

  const mut = useMutation({
    mutationFn: () => {
      const req: CustomerUpsertRequest = {
        ...form,
        name: form.name.trim(),
        documentNumber: form.documentNumber?.trim() || null,
        email: form.email?.trim() || null,
      }
      return initial ? customersApi.update(initial.id, req) : customersApi.create(req)
    },
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast(initial ? 'Cliente actualizado' : `Cliente ${c.name} creado`, 'success')
      onSaved?.(c)
      onClose()
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast(e.response?.data?.message ?? 'No se pudo guardar el cliente', 'error'),
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          {initial ? `Editar cliente · ${initial.name}` : 'Nuevo cliente'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSm}>Nombre *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label style={labelSm}>Tipo de documento</label>
            <select style={inputStyle} value={form.documentType ?? ''}
              onChange={e => set('documentType', e.target.value || null)}>
              <option value="">Sin documento</option>
              {(Object.keys(DOC_LABELS) as DocumentType[]).map(dt => (
                <option key={dt} value={dt}>{DOC_LABELS[dt]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSm}>Número de documento</label>
            <input style={inputStyle} value={form.documentNumber ?? ''} onChange={e => set('documentNumber', e.target.value)} />
            {docIncomplete && <span style={{ fontSize: 11, color: 'var(--neg)' }}>Tipo y número van juntos</span>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSm}>Razón social</label>
            <input style={inputStyle} value={form.legalName ?? ''} onChange={e => set('legalName', e.target.value)} />
          </div>
          <div>
            <label style={labelSm}>Email</label>
            <input style={inputStyle} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            {emailInvalid && <span style={{ fontSize: 11, color: 'var(--neg)' }}>Email no válido</span>}
          </div>
          <div>
            <label style={labelSm}>Teléfono</label>
            <input style={inputStyle} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label style={labelSm}>Ciudad</label>
            <input style={inputStyle} value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label style={labelSm}>Plazo de pago por defecto (días)</label>
            <input style={inputStyle} type="number" min={0} value={form.defaultPaymentTermDays ?? ''}
              onChange={e => set('defaultPaymentTermDays', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSm}>Dirección</label>
            <input style={inputStyle} value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSm}>Notas</label>
            <textarea style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }} value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear cliente'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Vista principal ─────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export function Customers() {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [pendingOnly, setPendingOnly] = useState(false)
  const [minDays, setMinDays] = useState('')
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('customer'))

  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [qInput])

  const searchParams = {
    q: q || undefined,
    segments: segments.length ? segments : undefined,
    pendingOnly: pendingOnly || undefined,
    minDaysSinceLastPurchase: minDays !== '' ? Number(minDays) : undefined,
    page, size: PAGE_SIZE,
  }

  const { data: pageData } = useQuery({
    queryKey: ['customers', 'search', searchParams],
    queryFn: () => customersApi.search(searchParams),
  })
  const { data: summary } = useQuery({
    queryKey: ['customers', 'summary'],
    queryFn: () => customersApi.summary(),
  })

  const customers = pageData?.content ?? []
  const totalPages = Math.max(1, Math.ceil((pageData?.totalElements ?? 0) / PAGE_SIZE))

  const toggleSegment = (s: CustomerSegment) => {
    setSegments(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    setPage(0)
  }

  const openDetail = (id: string) => {
    setSelectedId(id)
    window.history.replaceState(null, '', `?customer=${id}`)
  }
  const closeDetail = () => {
    setSelectedId(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (selectedId) {
    return <CustomerDetail customerId={selectedId} onBack={closeDetail} />
  }

  const pct = (n: number) => summary && summary.total > 0 ? ` (${Math.round(n / summary.total * 100)}%)` : ''

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Clientes</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Ficha, comportamiento de compra y segmentación
          </div>
        </div>
        <PrimaryBtn style={{ marginLeft: 'auto' }} onClick={() => setCreating(true)}>+ Nuevo cliente</PrimaryBtn>
      </div>

      {/* KPIs por segmento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard label="Total clientes" value={String(summary?.total ?? '—')} />
        <KpiCard label="Nuevos" value={`${summary?.bySegment.NEW ?? '—'}${pct(summary?.bySegment.NEW ?? 0)}`} />
        <KpiCard label="Recurrentes" value={`${summary?.bySegment.RECURRING ?? '—'}${pct(summary?.bySegment.RECURRING ?? 0)}`} />
        <KpiCard label="En riesgo" value={`${summary?.bySegment.AT_RISK ?? '—'}${pct(summary?.bySegment.AT_RISK ?? 0)}`} />
        <KpiCard label="Inactivos" value={`${summary?.bySegment.INACTIVE ?? '—'}${pct(summary?.bySegment.INACTIVE ?? 0)}`} />
        <KpiCard label="Saldo pendiente" value={summary ? formatCOP(summary.totalPendingBalance) : '—'} />
      </div>

      {/* Filtros */}
      <Card style={{ padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, width: 260 }}
          placeholder="Buscar por nombre, documento o razón social…"
          value={qInput}
          onChange={e => setQInput(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map(s => (
            <button key={s} onClick={() => toggleSegment(s)}
              style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
                border: segments.includes(s) ? `1.5px solid ${SEGMENT_COLORS[s].color}` : '1.5px solid var(--border)',
                background: segments.includes(s) ? SEGMENT_COLORS[s].bg : 'transparent',
                color: segments.includes(s) ? SEGMENT_COLORS[s].color : 'var(--muted)',
              }}>
              {SEGMENT_LABELS[s]}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={pendingOnly} onChange={e => { setPendingOnly(e.target.checked); setPage(0) }} />
          Solo con saldo pendiente
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)' }}>
          Sin comprar hace ≥
          <input style={{ ...inputStyle, width: 64, padding: '5px 8px' }} type="number" min={0}
            value={minDays} onChange={e => { setMinDays(e.target.value); setPage(0) }} />
          días
        </label>
        {(q || segments.length > 0 || pendingOnly || minDays !== '') && (
          <GhostBtn style={{ fontSize: 12 }} onClick={() => {
            setQInput(''); setQ(''); setSegments([]); setPendingOnly(false); setMinDays(''); setPage(0)
          }}>Limpiar filtros</GhostBtn>
        )}
      </Card>

      {/* Tabla */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Documento</th>
                <th style={thStyle}>Contacto</th>
                <th style={thStyle}>Compras</th>
                <th style={thStyle}>Facturado</th>
                <th style={thStyle}>Ticket prom.</th>
                <th style={thStyle}>Última compra</th>
                <th style={thStyle}>Saldo</th>
                <th style={thStyle}>Segmento</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{ ...tdStyle }}>
                    <button onClick={() => openDetail(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                      {c.name}
                    </button>
                    {c.legalName && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.legalName}</div>}
                  </td>
                  <td style={tdStyle}>
                    {c.documentType ? `${DOC_LABELS[c.documentType]} ${c.documentNumber}` : '—'}
                  </td>
                  <td style={tdStyle}>
                    <div>{c.phone ?? '—'}</div>
                    {c.email && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</div>}
                  </td>
                  <td style={tdStyle}>{c.totalPurchases}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(c.totalInvoiced)}</td>
                  <td style={tdStyle}>{c.totalPurchases > 0 ? formatCOP(c.avgTicket) : '—'}</td>
                  <td style={tdStyle}>
                    {fmtDate(c.lastPurchaseAt)}
                    {c.daysSinceLastPurchase != null && c.daysSinceLastPurchase > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>hace {c.daysSinceLastPurchase} días</div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: c.pendingBalance > 0 ? 'var(--neg)' : 'var(--muted)' }}>
                    {c.pendingBalance > 0 ? formatCOP(c.pendingBalance) : '—'}
                  </td>
                  <td style={tdStyle}><SegmentBadge segment={c.segment} /></td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Sin clientes con estos filtros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {pageData?.totalElements ?? 0} clientes · página {page + 1} de {totalPages}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <GhostBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</GhostBtn>
            <GhostBtn disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</GhostBtn>
          </div>
        </div>
      </Card>

      {creating && <CustomerFormModal onClose={() => setCreating(false)} />}
    </div>
  )
}
