import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, KpiCard, GhostBtn, StatusChip, Select, tableStyle, thStyle, tdStyle } from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { customerApi } from '../sales/api/salesApi'
import { RegisterPaymentModal, VoidReceiptModal } from './RegisterPaymentModal'
import {
  receivablesApi,
  type ReceivableDto, type ReceivableStatus, type AgingBucket,
} from './api/receivablesApi'

const STATUS_LABELS: Record<ReceivableStatus, string> = {
  PENDING: 'Pendiente', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const STATUS_TO_CHIP: Record<ReceivableStatus, string> = {
  PENDING: 'pending', PARTIALLY_PAID: 'partial', PAID: 'paid', CANCELLED: 'critical',
}
const BUCKET_LABELS: Record<AgingBucket, string> = {
  CURRENT: 'Corriente', D1_30: '1–30 días', D31_60: '31–60 días', D60_PLUS: '+60 días',
}
const BUCKET_COLORS: Record<AgingBucket, { bg: string; color: string }> = {
  CURRENT: { bg: 'var(--pos-bg)', color: 'var(--pos)' },
  D1_30: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
  D31_60: { bg: 'color-mix(in srgb, #ea580c 15%, transparent)', color: '#ea580c' },
  D60_PLUS: { bg: 'var(--neg-bg)', color: 'var(--neg)' },
}
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
}

function BucketBadge({ bucket }: { bucket: AgingBucket }) {
  const c = BUCKET_COLORS[bucket]
  return (
    <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 100, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>
      {BUCKET_LABELS[bucket]}
    </span>
  )
}

const fmtDate = (v: string) =>
  new Date(v.length === 10 ? v + 'T00:00:00' : v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const PAGE_SIZE = 15

// ─── Detalle expandible: recibos aplicados a una CxC ─────────────────────────

function ReceivablePayments({ receivable, onVoid }: {
  receivable: ReceivableDto
  onVoid: (receiptId: string, number: string) => void
}) {
  const { data: payments = [] } = useQuery({
    queryKey: ['receivables', 'payments', receivable.id],
    queryFn: () => receivablesApi.payments(receivable.id),
  })

  return (
    <div style={{ padding: '10px 18px 14px', background: 'var(--bg)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
        RECIBOS APLICADOS ({payments.length})
      </div>
      {payments.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sin abonos registrados.</div>}
      {payments.map(p => (
        <div key={p.receiptId + receivable.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <b style={{ textDecoration: p.status === 'VOIDED' ? 'line-through' : undefined }}>{p.number}</b>
          <span>{formatCOP(p.appliedAmount)}</span>
          <span style={{ color: 'var(--muted)' }}>
            {fmtDate(p.receiptDate)} · {METHOD_LABELS[p.paymentMethod]}{p.reference ? ` · ${p.reference}` : ''}
          </span>
          {p.status === 'VOIDED' ? (
            <span style={{ color: 'var(--neg)', fontSize: 11.5 }}>Anulado: {p.voidReason}</span>
          ) : (
            <GhostBtn style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 9px', color: 'var(--neg)' }}
              onClick={() => onVoid(p.receiptId, p.number)}>✕ Anular</GhostBtn>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Vista de antigüedad ─────────────────────────────────────────────────────

function AgingView() {
  const { data: aging } = useQuery({ queryKey: ['receivables', 'aging'], queryFn: receivablesApi.aging })
  if (!aging) return <div style={{ padding: 30, color: 'var(--muted)' }}>Cargando antigüedad…</div>

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Corriente</th>
              <th style={thStyle}>1–30 días</th>
              <th style={thStyle}>31–60 días</th>
              <th style={thStyle}>+60 días</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {aging.rows.map(r => (
              <tr key={r.customerId}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{r.customerName}</td>
                <td style={tdStyle}>{r.current > 0 ? formatCOP(r.current) : '—'}</td>
                <td style={{ ...tdStyle, color: r.d1To30 > 0 ? 'var(--warn)' : undefined, fontWeight: r.d1To30 > 0 ? 600 : undefined }}>
                  {r.d1To30 > 0 ? formatCOP(r.d1To30) : '—'}</td>
                <td style={{ ...tdStyle, color: r.d31To60 > 0 ? '#ea580c' : undefined, fontWeight: r.d31To60 > 0 ? 600 : undefined }}>
                  {r.d31To60 > 0 ? formatCOP(r.d31To60) : '—'}</td>
                <td style={{ ...tdStyle, color: r.d60Plus > 0 ? 'var(--neg)' : undefined, fontWeight: r.d60Plus > 0 ? 700 : undefined }}>
                  {r.d60Plus > 0 ? formatCOP(r.d60Plus) : '—'}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text)' }}>{formatCOP(r.total)}</td>
              </tr>
            ))}
            {aging.rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                Sin cartera abierta. 🎉
              </td></tr>
            )}
          </tbody>
          {aging.rows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--text)' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAL</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCOP(aging.totalsByBucket.CURRENT)}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCOP(aging.totalsByBucket.D1_30)}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCOP(aging.totalsByBucket.D31_60)}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCOP(aging.totalsByBucket.D60_PLUS)}</td>
                <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--text)' }}>{formatCOP(aging.totalPending)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}

// ─── Vista principal ─────────────────────────────────────────────────────────

export function Receivables() {
  const [tab, setTab] = useState<'cartera' | 'aging'>('cartera')
  const [customerFilter, setCustomerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bucketFilter, setBucketFilter] = useState('')
  const [openOnly, setOpenOnly] = useState(true)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paying, setPaying] = useState<ReceivableDto | null>(null)
  const [voiding, setVoiding] = useState<{ id: string; number: string } | null>(null)

  const { data: aging } = useQuery({ queryKey: ['receivables', 'aging'], queryFn: receivablesApi.aging })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customerApi.listAll })

  const { data: pageData } = useQuery({
    queryKey: ['receivables', 'list', customerFilter, statusFilter, bucketFilter, openOnly, page],
    queryFn: () => receivablesApi.list({
      customerId: customerFilter || undefined,
      status: statusFilter || undefined,
      agingBucket: bucketFilter || undefined,
      openOnly,
      page, size: PAGE_SIZE,
    }),
  })
  const items = pageData?.content ?? []
  const totalPages = Math.max(1, Math.ceil((pageData?.totalElements ?? 0) / PAGE_SIZE))

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp 0.25s ease' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Cuentas por cobrar</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          Cartera de clientes, recibos de caja y antigüedad
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Total por cobrar" value={aging ? formatCOP(aging.totalPending) : '—'} />
        <KpiCard label="Total vencido" value={aging ? formatCOP(aging.totalOverdue) : '—'}
          sub={aging && aging.totalPending > 0 ? `${Math.round(aging.totalOverdue / aging.totalPending * 100)}% de la cartera` : undefined} />
        <KpiCard label="Facturas pendientes" value={aging ? String(aging.openCount) : '—'} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([['cartera', 'Cartera'], ['aging', 'Antigüedad']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding: '7px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: '1.5px solid ' + (tab === key ? 'var(--accent)' : 'var(--border)'),
              background: tab === key ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              color: tab === key ? 'var(--accent-text)' : 'var(--muted)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'aging' ? <AgingView /> : (
        <>
          {/* Filtros */}
          <Card style={{ padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              style={{ width: 200 }}
              value={customerFilter}
              onChange={v => { setCustomerFilter(v); setPage(0) }}
              options={[
                { value: '', label: 'Todos los clientes' },
                ...customers.filter(c => !c.anonymous).map(c => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              style={{ width: 160 }}
              value={statusFilter}
              onChange={v => { setStatusFilter(v); setPage(0) }}
              options={[
                { value: '', label: openOnly ? 'Pendiente y parcial' : 'Todos los estados' },
                ...(Object.keys(STATUS_LABELS) as ReceivableStatus[])
                  .filter(s => !openOnly || s === 'PENDING' || s === 'PARTIALLY_PAID')
                  .map(s => ({ value: s, label: STATUS_LABELS[s] })),
              ]}
            />
            <Select
              style={{ width: 160 }}
              value={bucketFilter}
              onChange={v => { setBucketFilter(v); setPage(0) }}
              options={[
                { value: '', label: 'Toda antigüedad' },
                ...(Object.keys(BUCKET_LABELS) as AgingBucket[]).map(b => ({ value: b, label: BUCKET_LABELS[b] })),
              ]}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!openOnly}
                onChange={e => { setOpenOnly(!e.target.checked); setStatusFilter(''); setPage(0) }}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
              Ver también pagadas y canceladas
            </label>
            {(customerFilter || statusFilter || bucketFilter || !openOnly) && (
              <GhostBtn style={{ fontSize: 12 }} onClick={() => {
                setCustomerFilter(''); setStatusFilter(''); setBucketFilter(''); setOpenOnly(true); setPage(0)
              }}>Limpiar</GhostBtn>
            )}
          </Card>

          {/* Tabla */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Factura</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Pagado</th>
                    <th style={thStyle}>Saldo</th>
                    <th style={thStyle}>Vencimiento</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Antigüedad</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(ar => {
                    const open = ar.status === 'PENDING' || ar.status === 'PARTIALLY_PAID'
                    return [
                      <tr key={ar.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === ar.id ? null : ar.id)}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{ar.customerName}</td>
                        <td style={tdStyle}>{ar.invoiceNumber}</td>
                        <td style={tdStyle}>{formatCOP(ar.total)}</td>
                        <td style={{ ...tdStyle, color: 'var(--pos)' }}>{ar.paid > 0 ? formatCOP(ar.paid) : '—'}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: ar.pending > 0 && open ? 'var(--neg)' : 'var(--muted)' }}>
                          {open ? formatCOP(ar.pending) : '—'}
                        </td>
                        <td style={{ ...tdStyle, color: ar.daysOverdue > 0 ? 'var(--neg)' : undefined, fontWeight: ar.daysOverdue > 0 ? 600 : undefined }}>
                          {fmtDate(ar.dueDate)}
                          {ar.daysOverdue > 0 && <div style={{ fontSize: 11 }}>hace {ar.daysOverdue} días</div>}
                        </td>
                        <td style={tdStyle}><StatusChip status={STATUS_TO_CHIP[ar.status]} label={STATUS_LABELS[ar.status]} /></td>
                        <td style={tdStyle}>{open ? <BucketBadge bucket={ar.agingBucket} /> : '—'}</td>
                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                          {open && (
                            <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--pos)' }}
                              onClick={() => setPaying(ar)}>
                              Pagar
                            </GhostBtn>
                          )}
                        </td>
                      </tr>,
                      expanded === ar.id && (
                        <tr key={ar.id + '-detail'}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <ReceivablePayments receivable={ar} onVoid={(id, number) => setVoiding({ id, number })} />
                          </td>
                        </tr>
                      ),
                    ]
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                      Sin cuentas por cobrar con estos filtros.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {pageData?.totalElements ?? 0} cuentas · página {page + 1} de {totalPages}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <GhostBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</GhostBtn>
                <GhostBtn disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</GhostBtn>
              </div>
            </div>
          </Card>
        </>
      )}

      {paying && (
        <RegisterPaymentModal customerId={paying.customerId} customerName={paying.customerName}
          receivable={paying} onClose={() => setPaying(null)} />
      )}
      {voiding && (
        <VoidReceiptModal receiptId={voiding.id} receiptNumber={voiding.number} onClose={() => setVoiding(null)} />
      )}
    </div>
  )
}
