import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import { salesInvoiceApi, type SalesInvoiceDto, type SalesInvoiceStatus } from '../sales/api/salesApi'

const STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  ISSUED: 'Emitida', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const STATUS_TO_CHIP: Record<SalesInvoiceStatus, string> = {
  ISSUED: 'issued', PAID: 'paid', CANCELLED: 'critical',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}

function CancelInvoiceModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMut = useMutation({
    mutationFn: () => salesInvoiceApi.cancel(invoice.id, reason),
    onSuccess: inv => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast(`Factura ${inv.invoiceNumber} cancelada`, 'info')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al cancelar la factura', 'error')
    },
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 440,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Cancelar factura {invoice.invoiceNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          {invoice.customerName} · {formatCOP(invoice.total)}
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

export function Invoicing() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancelling, setCancelling] = useState<SalesInvoiceDto | null>(null)

  const { data: invoices = [] } = useQuery({ queryKey: ['sales-invoices'], queryFn: () => salesInvoiceApi.list() })

  const payMut = useMutation({
    mutationFn: (id: string) => salesInvoiceApi.pay(id),
    onSuccess: inv => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      toast(`Factura ${inv.invoiceNumber} marcada como pagada`, 'success')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al marcar el pago', 'error')
    },
  })

  const filtered = invoices.filter(i => statusFilter === 'all' || i.status === statusFilter)
  const count = (s: SalesInvoiceStatus) => invoices.filter(i => i.status === s).length
  const paidTotal = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + i.total, 0)
  const pendingTotal = invoices.filter(i => i.status === 'ISSUED').reduce((acc, i) => acc + i.total, 0)

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {cancelling && <CancelInvoiceModal invoice={cancelling} onClose={() => setCancelling(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Emitidas" value={String(count('ISSUED'))} sub={`${formatCOP(pendingTotal)} por cobrar`} />
        <KpiCard label="Pagadas" value={String(count('PAID'))} sub={formatCOP(paidTotal)} />
        <KpiCard label="Canceladas" value={String(count('CANCELLED'))} sub="con novedad" />
        <KpiCard label="Total facturas" value={String(invoices.length)} sub="históricas" />
      </div>

      <Card>
        <CardHeader title="Facturación de ventas" action={
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Las facturas se generan desde el detalle del pedido en Ventas</span>
        } />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all', label: 'Todas' },
            { value: 'ISSUED', label: 'Emitidas' },
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
                <th style={thStyle}>Total</th>
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
                  <td style={tdStyle}>{new Date(inv.issuedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(inv.total)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <StatusChip status={STATUS_TO_CHIP[inv.status]} label={STATUS_LABELS[inv.status]} />
                      {inv.status === 'CANCELLED' && inv.cancelReason && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.cancelReason}</span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {inv.status === 'ISSUED' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--pos)' }}
                          onClick={() => payMut.mutate(inv.id)}>✓ Pagada</GhostBtn>
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--neg)' }}
                          onClick={() => setCancelling(inv)}>✕ Cancelar</GhostBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Sin facturas. Genera una desde el detalle de un pedido en Ventas.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
