import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import {
  salesInvoiceApi,
  type SalesInvoiceDto, type SalesInvoiceStatus,
  type PaymentForm, type InvoicePaymentMethod,
} from '../sales/api/salesApi'

const STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'Borrador', ISSUED: 'Emitida', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const STATUS_TO_CHIP: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'draft', ISSUED: 'issued', PARTIALLY_PAID: 'partial', PAID: 'paid', CANCELLED: 'critical',
}
const METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modalBox: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 440,
}
const labelSm: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4,
}

// ─── Modal: cancelar (novedad obligatoria; emitida/pagada genera nota crédito) ─

function CancelInvoiceModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMut = useMutation({
    mutationFn: () => salesInvoiceApi.cancel(invoice.id, reason),
    onSuccess: inv => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast(invoice.status === 'DRAFT'
        ? `Borrador ${inv.invoiceNumber} cancelado`
        : `Factura ${inv.invoiceNumber} cancelada · nota crédito generada`, 'info')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al cancelar la factura', 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Cancelar factura {invoice.invoiceNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          {invoice.customerName} · {formatCOP(invoice.total)}
          {invoice.status !== 'DRAFT' && ' · se generará una nota crédito'}
        </div>
        <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
          placeholder="Novedad de cancelación (obligatoria)"
          value={reason} onChange={e => setReason(e.target.value)} autoFocus />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn style={{ background: 'var(--neg)' }} disabled={!reason.trim() || cancelMut.isPending}
            onClick={() => cancelMut.mutate()}>
            Confirmar cancelación
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: emitir borrador ───────────────────────────────────────────────────

function EmitModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [paymentForm, setPaymentForm] = useState<PaymentForm>('CASH')
  const [creditDays, setCreditDays] = useState('15')
  const [method, setMethod] = useState<InvoicePaymentMethod>('CASH')

  const emitMut = useMutation({
    mutationFn: () => salesInvoiceApi.emit(invoice.id, {
      paymentForm,
      creditTermDays: paymentForm === 'CREDIT' ? parseInt(creditDays) : 0,
      paymentMethod: method,
    }),
    onSuccess: inv => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast(`Factura ${inv.invoiceNumber} emitida`, 'success')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al emitir la factura', 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Emitir factura {invoice.invoiceNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          {invoice.customerName} · {formatCOP(invoice.total)}
        </div>
        <label style={labelSm}>FORMA DE PAGO</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {([['CASH', 'Contado'], ['CREDIT', 'Crédito']] as [PaymentForm, string][]).map(([f, l]) => (
            <button key={f} type="button" onClick={() => setPaymentForm(f)}
              style={{
                ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: paymentForm === f ? 700 : 500,
                borderColor: paymentForm === f ? 'var(--accent)' : 'var(--border)',
              }}>{l}</button>
          ))}
          {paymentForm === 'CREDIT' && (
            <select style={{ ...inputStyle, width: 110 }} value={creditDays} onChange={e => setCreditDays(e.target.value)}>
              <option value="15">15 días</option>
              <option value="30">30 días</option>
            </select>
          )}
        </div>
        <label style={labelSm}>MEDIO DE PAGO PREVISTO</label>
        <select style={{ ...inputStyle, marginBottom: 16 }} value={method} onChange={e => setMethod(e.target.value as InvoicePaymentMethod)}>
          {(Object.keys(METHOD_LABELS) as InvoicePaymentMethod[]).map(m => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn disabled={emitMut.isPending} onClick={() => emitMut.mutate()}>
            {emitMut.isPending ? 'Emitiendo…' : 'Emitir factura'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: registrar pago (parcial o total, validado contra saldo) ───────────

function PaymentModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState<InvoicePaymentMethod>('CASH')
  const [reference, setReference] = useState('')

  const payMut = useMutation({
    mutationFn: () => salesInvoiceApi.registerPayment(invoice.id, {
      amount: parseFloat(amount), paymentMethod: method, reference: reference.trim() || undefined,
    }),
    onSuccess: inv => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast(inv.status === 'PAID'
        ? `Factura ${inv.invoiceNumber} pagada por completo`
        : `Pago registrado · saldo ${formatCOP(inv.balance)}`, 'success')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al registrar el pago', 'error')
    },
  })

  const value = parseFloat(amount)
  const valid = value > 0 && value <= invoice.balance

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Registrar pago · {invoice.invoiceNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Saldo pendiente: <b style={{ color: 'var(--text)' }}>{formatCOP(invoice.balance)}</b>
        </div>
        <label style={labelSm}>MONTO</label>
        <input style={{ ...inputStyle, marginBottom: 10 }} type="number" min="1" max={invoice.balance}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        {!valid && amount !== '' && (
          <div style={{ fontSize: 12, color: 'var(--neg)', marginTop: -6, marginBottom: 8 }}>
            El monto debe ser mayor a cero y no exceder el saldo.
          </div>
        )}
        <label style={labelSm}>MEDIO DE PAGO</label>
        <select style={{ ...inputStyle, marginBottom: 10 }} value={method} onChange={e => setMethod(e.target.value as InvoicePaymentMethod)}>
          {(Object.keys(METHOD_LABELS) as InvoicePaymentMethod[]).map(m => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </select>
        <label style={labelSm}>REFERENCIA (OPCIONAL)</label>
        <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="ej. TX-12345" value={reference}
          onChange={e => setReference(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn disabled={!valid || payMut.isPending} onClick={() => payMut.mutate()}>
            {payMut.isPending ? 'Registrando…' : 'Registrar pago'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Página de Facturación ────────────────────────────────────────────────────

const STATUS_OPTIONS: SalesInvoiceStatus[] = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']
const DATE_PRESETS = [
  { key: '', label: 'Cualquier fecha' },
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'prevMonth', label: 'Mes anterior' },
  { key: 'custom', label: 'Personalizado' },
]

function presetRange(key: string): { from?: string; to?: string } {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (key === 'today') return { from: iso(today), to: iso(today) }
  if (key === '7d') { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: iso(d), to: iso(today) } }
  if (key === 'month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
  if (key === 'prevMonth') {
    return {
      from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  return {}
}

interface Filters {
  q: string
  statuses: SalesInvoiceStatus[]
  preset: string
  from: string
  to: string
  customerId: string
  minTotal: string
  maxTotal: string
  overdueOnly: boolean
}

const EMPTY_FILTERS: Filters = {
  q: '', statuses: [], preset: '', from: '', to: '', customerId: '', minTotal: '', maxTotal: '', overdueOnly: false,
}

/** Lee los filtros desde la URL para que se puedan compartir/recargar. */
function filtersFromUrl(): Filters {
  const p = new URLSearchParams(window.location.search)
  return {
    q: p.get('q') ?? '',
    statuses: (p.get('statuses')?.split(',').filter(Boolean) ?? []) as SalesInvoiceStatus[],
    preset: p.get('preset') ?? '',
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    customerId: p.get('customerId') ?? '',
    minTotal: p.get('minTotal') ?? '',
    maxTotal: p.get('maxTotal') ?? '',
    overdueOnly: p.get('overdueOnly') === 'true',
  }
}

export function Invoicing() {
  const [filters, setFilters] = useState<Filters>(filtersFromUrl)
  const [qInput, setQInput] = useState(filters.q)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [cancelling, setCancelling] = useState<SalesInvoiceDto | null>(null)
  const [emitting, setEmitting] = useState<SalesInvoiceDto | null>(null)
  const [paying, setPaying] = useState<SalesInvoiceDto | null>(null)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await import('../sales/api/salesApi')).customerApi.listAll(),
  })

  // Debounce de la búsqueda por texto
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => (f.q === qInput ? f : { ...f, q: qInput }))
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [qInput])

  // Persistir filtros en la URL (compartible/recargable)
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.statuses.length) p.set('statuses', filters.statuses.join(','))
    if (filters.preset) p.set('preset', filters.preset)
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (filters.customerId) p.set('customerId', filters.customerId)
    if (filters.minTotal) p.set('minTotal', filters.minTotal)
    if (filters.maxTotal) p.set('maxTotal', filters.maxTotal)
    if (filters.overdueOnly) p.set('overdueOnly', 'true')
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters])

  const range = filters.preset === 'custom' ? { from: filters.from || undefined, to: filters.to || undefined } : presetRange(filters.preset)
  const apiParams = {
    q: filters.q || undefined,
    statuses: filters.statuses.length ? filters.statuses : undefined,
    customerId: filters.customerId || undefined,
    from: range.from,
    to: range.to,
    minTotal: filters.minTotal || undefined,
    maxTotal: filters.maxTotal || undefined,
    overdueOnly: filters.overdueOnly || undefined,
  }

  const { data: pageData } = useQuery({
    queryKey: ['sales-invoices-search', apiParams, page, sortField, sortDir],
    queryFn: () => salesInvoiceApi.search({ ...apiParams, page, size: 20, sortField, sortDir }),
  })
  const { data: summary } = useQuery({
    queryKey: ['sales-invoices-summary', apiParams],
    queryFn: () => salesInvoiceApi.summary(apiParams),
  })

  const invoices = pageData?.content ?? []
  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.totalElements / pageData.size)) : 1

  function toggleStatus(st: SalesInvoiceStatus) {
    setFilters(f => ({
      ...f,
      statuses: f.statuses.includes(st) ? f.statuses.filter(x => x !== st) : [...f.statuses, st],
    }))
    setPage(0)
  }

  function sortBy(field: string) {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const activeChips: { label: string; clear: () => void }[] = []
  if (filters.q) activeChips.push({ label: `“${filters.q}”`, clear: () => { setQInput(''); setFilters(f => ({ ...f, q: '' })) } })
  filters.statuses.forEach(st => activeChips.push({ label: STATUS_LABELS[st], clear: () => toggleStatus(st) }))
  if (filters.preset) activeChips.push({ label: DATE_PRESETS.find(d => d.key === filters.preset)?.label ?? filters.preset, clear: () => setFilters(f => ({ ...f, preset: '', from: '', to: '' })) })
  if (filters.customerId) activeChips.push({ label: customers.find(c => c.id === filters.customerId)?.name ?? 'Cliente', clear: () => setFilters(f => ({ ...f, customerId: '' })) })
  if (filters.minTotal || filters.maxTotal) activeChips.push({ label: `${filters.minTotal ? formatCOP(Number(filters.minTotal)) : '…'} – ${filters.maxTotal ? formatCOP(Number(filters.maxTotal)) : '…'}`, clear: () => setFilters(f => ({ ...f, minTotal: '', maxTotal: '' })) })
  if (filters.overdueOnly) activeChips.push({ label: 'Solo vencidas', clear: () => setFilters(f => ({ ...f, overdueOnly: false })) })

  const sortIndicator = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {cancelling && <CancelInvoiceModal invoice={cancelling} onClose={() => setCancelling(null)} />}
      {emitting && <EmitModal invoice={emitting} onClose={() => setEmitting(null)} />}
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} />}

      {/* KPIs (reflejan los filtros activos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <KpiCard label="Borradores" value={String(summary?.drafts ?? 0)} sub="por emitir" />
        <KpiCard label="Emitidas" value={String((summary?.issued ?? 0) + (summary?.partiallyPaid ?? 0))} sub={`${formatCOP(summary?.pendingBalance ?? 0)} por cobrar`} />
        <KpiCard label="Vencidas" value={String(summary?.overdue ?? 0)} sub={`${formatCOP(summary?.overdueBalance ?? 0)} en riesgo`} />
        <KpiCard label="Pagadas" value={String(summary?.paid ?? 0)} sub={formatCOP(summary?.paidTotal ?? 0)} />
        <KpiCard label="Canceladas" value={String(summary?.cancelled ?? 0)} sub="con novedad" />
      </div>

      <Card>
        <CardHeader title="Facturación de ventas" action={
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Las facturas nacen como borrador desde el pedido en Ventas</span>
        } />

        {/* Barra de filtros combinables */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...inputStyle, width: 240 }} placeholder="Buscar factura, pedido o cliente…"
              value={qInput} onChange={e => setQInput(e.target.value)} />
            <select style={{ ...inputStyle, width: 160 }} value={filters.preset}
              onChange={e => { setFilters(f => ({ ...f, preset: e.target.value, from: '', to: '' })); setPage(0) }}>
              {DATE_PRESETS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            {filters.preset === 'custom' && (
              <>
                <input style={{ ...inputStyle, width: 140 }} type="date" value={filters.from}
                  onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
                <input style={{ ...inputStyle, width: 140 }} type="date" value={filters.to}
                  onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              </>
            )}
            <select style={{ ...inputStyle, width: 180 }} value={filters.customerId}
              onChange={e => { setFilters(f => ({ ...f, customerId: e.target.value })); setPage(0) }}>
              <option value="">Todos los clientes</option>
              {customers.filter(c => !c.anonymous).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Monto mín."
              value={filters.minTotal} onChange={e => { setFilters(f => ({ ...f, minTotal: e.target.value })); setPage(0) }} />
            <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Monto máx."
              value={filters.maxTotal} onChange={e => { setFilters(f => ({ ...f, maxTotal: e.target.value })); setPage(0) }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={filters.overdueOnly}
                onChange={e => { setFilters(f => ({ ...f, overdueOnly: e.target.checked })); setPage(0) }} />
              Solo vencidas
            </label>
          </div>

          {/* Estados como chips conmutables (multi-select) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>ESTADOS:</span>
            {STATUS_OPTIONS.map(st => (
              <button key={st} type="button" onClick={() => toggleStatus(st)}
                style={{
                  border: filters.statuses.includes(st) ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: filters.statuses.includes(st) ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
                  borderRadius: 100, padding: '2px 4px', cursor: 'pointer',
                }}>
                <StatusChip status={STATUS_TO_CHIP[st]} label={STATUS_LABELS[st]} />
              </button>
            ))}
          </div>

          {/* Chips de filtros activos */}
          {activeChips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Filtros:</span>
              {activeChips.map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                  background: 'var(--surface-2)', borderRadius: 100, padding: '3px 10px', color: 'var(--text)',
                }}>
                  {c.label}
                  <button onClick={c.clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px' }}
                onClick={() => { setQInput(''); setFilters(EMPTY_FILTERS); setPage(0) }}>
                Limpiar todo
              </GhostBtn>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('invoiceNumber')}>Factura{sortIndicator('invoiceNumber')}</th>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Cliente</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('issuedAt')}>Emitida{sortIndicator('issuedAt')}</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('dueDate')}>Vence{sortIndicator('dueDate')}</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('total')}>Total{sortIndicator('total')}</th>
                <th style={thStyle}>Saldo</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('status')}>Estado{sortIndicator('status')}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{inv.invoiceNumber}</span></td>
                  <td style={tdStyle}>{inv.orderNumber}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{inv.customerName}</td>
                  <td style={tdStyle}>{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td style={{ ...tdStyle, color: inv.overdue ? 'var(--neg)' : undefined, fontWeight: inv.overdue ? 700 : undefined }}>
                    {inv.dueDate ? new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(inv.total)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: inv.balance > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' ? 'var(--neg)' : 'var(--muted)' }}>
                    {inv.status === 'DRAFT' || inv.status === 'CANCELLED' ? '—' : formatCOP(inv.balance)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <StatusChip status={STATUS_TO_CHIP[inv.status]} label={STATUS_LABELS[inv.status]} />
                        {inv.overdue && <StatusChip status="overdue" label="Vencida" />}
                      </div>
                      {inv.status === 'CANCELLED' && inv.cancelReason && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.cancelReason}</span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'DRAFT' && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--accent-text)' }}
                          onClick={() => setEmitting(inv)}>📤 Emitir</GhostBtn>
                      )}
                      {(inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--pos)' }}
                          onClick={() => setPaying(inv)}>+ Pago</GhostBtn>
                      )}
                      {inv.status !== 'CANCELLED' && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--neg)' }}
                          onClick={() => setCancelling(inv)}>✕</GhostBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Sin facturas con estos filtros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {pageData?.totalElements ?? 0} facturas · página {page + 1} de {totalPages}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <GhostBtn style={{ fontSize: 12, padding: '4px 12px' }} disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}>← Anterior</GhostBtn>
            <GhostBtn style={{ fontSize: 12, padding: '4px 12px' }} disabled={page + 1 >= totalPages}
              onClick={() => setPage(p => p + 1)}>Siguiente →</GhostBtn>
          </div>
        </div>
      </Card>
    </div>
  )
}
