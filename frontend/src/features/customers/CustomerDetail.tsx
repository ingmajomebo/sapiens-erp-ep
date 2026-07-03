import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, KpiCard, GhostBtn, StatusChip, tableStyle, thStyle, tdStyle } from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { useAppStore } from '../../store/useAppStore'
import { customersApi } from './api/customersApi'
import { SegmentBadge, CustomerFormModal, DOC_LABELS } from './Customers'

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PREPARING: 'En preparación', DISPATCHED: 'Despachado',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}
const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', ISSUED: 'Emitida', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const ORDER_STATUS_CHIP: Record<string, string> = {
  PENDING: 'pending', PREPARING: 'partial', DISPATCHED: 'issued', DELIVERED: 'delivered', CANCELLED: 'critical',
}

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const labelSm: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4,
}

/** Ficha del cliente: métricas, historial de compras y facturado de 12 meses. */
export function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const setPage = useAppStore(s => s.setPage)
  const [editing, setEditing] = useState(false)

  const { data: d, refetch } = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => customersApi.detail(customerId),
  })

  if (!d) return <div style={{ padding: 40, color: 'var(--muted)' }}>Cargando cliente…</div>
  const c = d.customer

  const chartData = d.monthlyTotals.map(m => {
    const [y, mm] = m.month.split('-')
    return { name: `${MONTH_LABELS[Number(mm) - 1]} ${y.slice(2)}`, total: m.total }
  })

  const openInvoice = (invoiceId: string) => {
    window.history.replaceState(null, '', `?invoice=${invoiceId}`)
    setPage('invoicing')
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.25s ease' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <GhostBtn style={{ fontSize: 12.5, padding: '6px 12px' }} onClick={onBack}>← Clientes</GhostBtn>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-text)' }}>{c.name}</span>
            <SegmentBadge segment={c.segment} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {c.documentType ? `${DOC_LABELS[c.documentType]} ${c.documentNumber}` : 'Sin documento'}
            {c.legalName && <> · {c.legalName}</>}
            {c.city && <> · {c.city}</>}
            {c.defaultPaymentTermDays != null && <> · Crédito {c.defaultPaymentTermDays} días</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {c.email && <GhostBtn onClick={() => { window.location.href = `mailto:${c.email}` }}>✉ Enviar correo</GhostBtn>}
          <GhostBtn onClick={() => setEditing(true)}>✎ Editar</GhostBtn>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <KpiCard label="Compras" value={String(c.totalPurchases)}
          sub={c.firstPurchaseAt ? `desde ${fmtDate(c.firstPurchaseAt)}` : undefined} />
        <KpiCard label="Total facturado" value={formatCOP(c.totalInvoiced)} />
        <KpiCard label="Ticket promedio" value={c.totalPurchases > 0 ? formatCOP(c.avgTicket) : '—'} />
        <KpiCard label="Última compra" value={c.daysSinceLastPurchase != null ? `hace ${c.daysSinceLastPurchase} días` : '—'}
          sub={fmtDate(c.lastPurchaseAt)} />
        <KpiCard label="Frecuencia promedio" value={c.avgFrequencyDays != null ? `cada ${c.avgFrequencyDays} días` : '—'} />
        <KpiCard label="Saldo pendiente" value={formatCOP(c.pendingBalance)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* Contacto y notas */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ ...labelSm, marginBottom: 10 }}>CONTACTO</div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div>📞 {c.phone ?? 'Sin teléfono'}</div>
            <div>✉ {c.email ?? 'Sin email'}</div>
            <div>📍 {d.address ?? 'Sin dirección'}{c.city ? `, ${c.city}` : ''}</div>
          </div>
          {d.notes && (
            <>
              <div style={{ ...labelSm, marginTop: 12, marginBottom: 6 }}>NOTAS</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{d.notes}</div>
            </>
          )}
        </Card>

        {/* Gráfica 12 meses */}
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ ...labelSm, marginBottom: 10 }}>FACTURADO ÚLTIMOS 12 MESES</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1000 ? `${v / 1000}k` : String(v)} width={44} />
                <Tooltip
                  formatter={(v) => [formatCOP(Number(v)), 'Facturado']}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Historial de compras */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
          Historial de compras ({d.purchases.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Factura</th>
              </tr>
            </thead>
            <tbody>
              {d.purchases.map(p => (
                <tr key={p.orderId}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{p.orderNumber}</td>
                  <td style={tdStyle}>{fmtDate(p.orderDate)}</td>
                  <td style={tdStyle}>
                    <StatusChip status={ORDER_STATUS_CHIP[p.orderStatus] ?? 'muted'}
                      label={ORDER_STATUS_LABELS[p.orderStatus] ?? p.orderStatus} />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(p.total)}</td>
                  <td style={tdStyle}>
                    {p.invoiceId ? (
                      <button onClick={() => openInvoice(p.invoiceId!)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
                        {p.invoiceNumber} · {INVOICE_STATUS_LABELS[p.invoiceStatus ?? ''] ?? p.invoiceStatus}
                      </button>
                    ) : <span style={{ color: 'var(--muted)' }}>Sin factura</span>}
                  </td>
                </tr>
              ))}
              {d.purchases.length === 0 && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Este cliente aún no tiene compras.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <CustomerFormModal
          initial={{ ...c, address: d.address, notes: d.notes }}
          onClose={() => setEditing(false)}
          onSaved={() => refetch()}
        />
      )}
    </div>
  )
}
