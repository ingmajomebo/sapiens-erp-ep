import { useState } from 'react'
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

export function Invoicing() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancelling, setCancelling] = useState<SalesInvoiceDto | null>(null)
  const [emitting, setEmitting] = useState<SalesInvoiceDto | null>(null)
  const [paying, setPaying] = useState<SalesInvoiceDto | null>(null)

  const { data: invoices = [] } = useQuery({ queryKey: ['sales-invoices'], queryFn: () => salesInvoiceApi.list() })

  const filtered = invoices.filter(i =>
    statusFilter === 'all' ? true
      : statusFilter === 'OVERDUE' ? i.overdue
      : i.status === statusFilter)
  const count = (s: SalesInvoiceStatus) => invoices.filter(i => i.status === s).length
  const paidTotal = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + i.total, 0)
  const pendingBalance = invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
    .reduce((acc, i) => acc + i.balance, 0)
  const overdueInvoices = invoices.filter(i => i.overdue)
  const overdueBalance = overdueInvoices.reduce((acc, i) => acc + i.balance, 0)

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {cancelling && <CancelInvoiceModal invoice={cancelling} onClose={() => setCancelling(null)} />}
      {emitting && <EmitModal invoice={emitting} onClose={() => setEmitting(null)} />}
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <KpiCard label="Borradores" value={String(count('DRAFT'))} sub="por emitir" />
        <KpiCard label="Emitidas" value={String(count('ISSUED') + count('PARTIALLY_PAID'))} sub={`${formatCOP(pendingBalance)} por cobrar`} />
        <KpiCard label="Vencidas" value={String(overdueInvoices.length)} sub={`${formatCOP(overdueBalance)} en riesgo`} />
        <KpiCard label="Pagadas" value={String(count('PAID'))} sub={formatCOP(paidTotal)} />
        <KpiCard label="Canceladas" value={String(count('CANCELLED'))} sub="con novedad" />
      </div>

      <Card>
        <CardHeader title="Facturación de ventas" action={
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Las facturas nacen como borrador desde el pedido en Ventas</span>
        } />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all', label: 'Todas' },
            { value: 'DRAFT', label: 'Borradores' },
            { value: 'ISSUED', label: 'Emitidas' },
            { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
            { value: 'OVERDUE', label: 'Solo vencidas' },
            { value: 'PAID', label: 'Pagadas' },
            { value: 'CANCELLED', label: 'Canceladas' },
          ]} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Factura</th>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Emitida</th>
                <th style={thStyle}>Vence</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Saldo</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
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
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Sin facturas en este estado. Se generan desde el detalle de un pedido en Ventas.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
