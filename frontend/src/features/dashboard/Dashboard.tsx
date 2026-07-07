import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { useAppStore } from '../../store/useAppStore'
import {
  KpiCard, Card, CardHeader, StatusChip, GhostBtn, tableStyle, tdStyle, thStyle,
} from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { salesInvoiceApi } from '../sales/api/salesApi'
import { expensesApi } from '../finance/api/expensesApi'
import { cashBanksApi } from '../finance/api/cashBanksApi'
import { inventoryApi } from '../inventory/api/inventoryApi'
import { productApi } from '../catalog/api/productApi'
import { receivablesApi } from '../receivables/api/receivablesApi'
import { accountsPayableApi } from '../procurement/api/accountsPayableApi'
import { purchaseOrderApi } from '../procurement/api/purchaseOrderApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const compactCOP = (v: number) => {
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  return a >= 1_000_000 ? `${sign}$${(a / 1_000_000).toFixed(1)}M`
    : a >= 1000 ? `${sign}$${Math.round(a / 1000)}k` : `${sign}$${a}`
}

/** Últimos 6 meses como llaves 'YYYY-MM' con etiqueta corta. */
function lastMonths(n: number) {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ key: monthKey(d), label: `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` })
  }
  return out
}

const fmtDate = (v: string | null) =>
  v ? new Date(v.length === 10 ? v + 'T00:00:00' : v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'

const INVOICE_CHIP: Record<string, { chip: string; label: string }> = {
  DRAFT: { chip: 'draft', label: 'Borrador' },
  ISSUED: { chip: 'issued', label: 'Emitida' },
  PARTIALLY_PAID: { chip: 'partial', label: 'Pago parcial' },
  PAID: { chip: 'paid', label: 'Pagada' },
  CANCELLED: { chip: 'critical', label: 'Cancelada' },
}
const PO_CHIP: Record<string, { chip: string; label: string }> = {
  DRAFT: { chip: 'draft', label: 'Borrador' },
  CONFIRMED: { chip: 'issued', label: 'Confirmada' },
  PARTIALLY_RECEIVED: { chip: 'partial', label: 'Parcial' },
  RECEIVED: { chip: 'delivered', label: 'Recibida' },
  CANCELLED: { chip: 'critical', label: 'Cancelada' },
}
const STOCK_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'var(--neg-bg)', label: 'Crítico' },
  OUT_OF_STOCK: { color: '#dc2626', bg: 'var(--neg-bg)', label: 'Agotado' },
  LOW: { color: '#d97706', bg: 'var(--warn-bg)', label: 'Bajo' },
}
const AGING_SLICES = [
  { key: 'CURRENT', label: 'Corriente', color: '#16a34a' },
  { key: 'D1_30', label: '1–30 días', color: '#f59e0b' },
  { key: 'D31_60', label: '31–60 días', color: '#ea580c' },
  { key: 'D60_PLUS', label: '+60 días', color: '#dc2626' },
] as const

const labelSm: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.03em' }

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const setPage = useAppStore(s => s.setPage)

  const { data: invoicesPage } = useQuery({ queryKey: ['sales-invoices', 'dashboard'], queryFn: () => salesInvoiceApi.search({ size: 1000, sortField: 'createdAt', sortDir: 'desc' }) })
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.listAll })
  const { data: stockPage } = useQuery({ queryKey: ['inventory-stock', 'dashboard'], queryFn: () => inventoryApi.listStock(0, 500) })
  const { data: productsPage } = useQuery({ queryKey: ['products'], queryFn: () => productApi.listAll(0, 500) })
  const { data: expiring = [] } = useQuery({ queryKey: ['expiring-lots', 30], queryFn: () => inventoryApi.getExpiringLots(30) })
  const { data: aging } = useQuery({ queryKey: ['receivables', 'aging'], queryFn: receivablesApi.aging })
  const { data: payables = [] } = useQuery({ queryKey: ['accounts-payable'], queryFn: accountsPayableApi.listAll })
  const { data: accounts = [] } = useQuery({ queryKey: ['financial-accounts'], queryFn: cashBanksApi.listAll })
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: purchaseOrderApi.listAll })

  const invoices = invoicesPage?.content ?? []
  const stock = stockPage?.content ?? []
  const products = productsPage?.content ?? []

  // ── Series mensual: ingresos (facturado no anulado) vs gastos ──────────────
  const months = lastMonths(6)
  const revByMonth: Record<string, number> = {}
  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue
    const ref = (inv.issuedAt ?? inv.createdAt)?.slice(0, 7)
    if (ref) revByMonth[ref] = (revByMonth[ref] ?? 0) + inv.total
  }
  const expByMonth: Record<string, number> = {}
  for (const e of expenses) {
    const k = e.expenseDate.slice(0, 7)
    expByMonth[k] = (expByMonth[k] ?? 0) + e.amount
  }
  const series = months.map(m => {
    const ingresos = revByMonth[m.key] ?? 0
    const gastos = expByMonth[m.key] ?? 0
    return { label: m.label, ingresos, gastos, utilidad: ingresos - gastos }
  })

  const thisMonth = monthKey(new Date())
  const revMonth = revByMonth[thisMonth] ?? 0
  const expMonth = expByMonth[thisMonth] ?? 0
  const profitMonth = revMonth - expMonth
  const margin = revMonth > 0 ? Math.round((profitMonth / revMonth) * 100) : 0

  // ── Valor de inventario (stock × costo promedio) ───────────────────────────
  const costById = new Map(products.map(p => [p.id, p.averageCost ?? 0]))
  const inventoryValue = stock.reduce((s, it) => s + it.currentStock * (costById.get(it.productId) ?? 0), 0)

  // ── Cartera, cuentas por pagar, saldo en cuentas ───────────────────────────
  const receivable = aging?.totalPending ?? 0
  const overdue = aging?.totalOverdue ?? 0
  const payable = payables.reduce((s, ap) => s + (ap.pendingAmount ?? 0), 0)
  const cash = accounts.filter(a => a.status === 'ACTIVE').reduce((s, a) => s + a.currentBalance, 0)
  const openInvoices = invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length

  // ── Alertas de inventario y vencimientos ───────────────────────────────────
  const lowStock = stock
    .filter(s => s.stockStatus === 'LOW' || s.stockStatus === 'CRITICAL' || s.stockStatus === 'OUT_OF_STOCK')
    .sort((a, b) => (a.stockStatus === 'CRITICAL' || a.stockStatus === 'OUT_OF_STOCK' ? -1 : 1))
  const expiringSoon = [...expiring].sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''))

  const recentInvoices = [...invoices].slice(0, 6)
  const recentPOs = [...purchaseOrders]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 6)

  const agingData = AGING_SLICES
    .map(s => ({ name: s.label, value: aging?.totalsByBucket?.[s.key] ?? 0, color: s.color }))
    .filter(d => d.value > 0)

  const daysUntil = (iso: string | null) => iso
    ? Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000) : null

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeUp 0.25s ease' }}>
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Panel del negocio</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Ingresos del mes" value={formatCOP(revMonth)} sub="facturado este mes" />
        <KpiCard label="Gastos del mes" value={formatCOP(expMonth)} sub="egresos este mes" />
        <KpiCard label="Utilidad del mes" value={formatCOP(profitMonth)}
          trend={revMonth > 0 ? `${margin}% margen` : undefined} trendPositive={profitMonth >= 0} />
        <KpiCard label="Valor de inventario" value={formatCOP(inventoryValue)} sub={`${stock.length} productos`} />
      </div>

      {/* KPIs financieros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Por cobrar" value={formatCOP(receivable)}
          sub={overdue > 0 ? `${formatCOP(overdue)} vencido` : 'al día'} />
        <KpiCard label="Por pagar" value={formatCOP(payable)} sub="a proveedores" />
        <KpiCard label="Saldo en cuentas" value={formatCOP(cash)} sub={`${accounts.length} cuentas`} />
        <KpiCard label="Facturas pendientes" value={String(openInvoices)} sub="emitidas sin pagar" />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title="Ingresos vs Gastos (6 meses)" action={
            <div style={{ display: 'flex', gap: 12 }}>
              <Legend swatch="var(--accent)" text="Ingresos" />
              <Legend swatch="var(--neg)" text="Gastos" />
              <Legend swatch="#7c3aed" text="Utilidad" />
            </div>
          } />
          <div style={{ padding: '14px 14px 8px', height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 6, right: 6, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false}
                  width={44} tickFormatter={(v: number) => compactCOP(v)} />
                <Tooltip formatter={(v) => formatCOP(Number(v))}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="gastos" name="Gastos" fill="var(--neg)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Cartera por antigüedad" />
          <div style={{ padding: '10px 14px', height: 240, display: 'flex', flexDirection: 'column' }}>
            {agingData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Sin cartera pendiente. 🎉
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={agingData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                        {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCOP(Number(v))}
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {agingData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
                      <span style={{ flex: 1, color: 'var(--muted)' }}>{d.name}</span>
                      <span style={{ fontWeight: 600 }}>{formatCOP(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Alertas de inventario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title="Bajo stock" action={
            <span style={{ fontSize: 11.5, fontWeight: 700, color: lowStock.length ? 'var(--neg)' : 'var(--muted)', background: lowStock.length ? 'var(--neg-bg)' : 'var(--bg)', padding: '2px 8px', borderRadius: 6 }}>
              {lowStock.length}
            </span>
          } />
          <div style={{ padding: '6px 0' }}>
            {lowStock.length === 0 && <Empty text="Todo el inventario en nivel objetivo." />}
            {lowStock.slice(0, 6).map((it, i) => {
              const st = STOCK_STYLE[it.stockStatus] ?? STOCK_STYLE.LOW
              return (
                <Row key={it.productId} last={i === Math.min(lowStock.length, 6) - 1}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.productName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>mín. {it.minimumStock}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{it.currentStock}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>{st.label}</span>
                </Row>
              )
            })}
          </div>
          {lowStock.length > 0 && <CardFooter onClick={() => setPage('inventory')} />}
        </Card>

        <Card>
          <CardHeader title="Por vencer (30 días)" action={
            <span style={{ fontSize: 11.5, fontWeight: 700, color: expiringSoon.length ? 'var(--warn)' : 'var(--muted)', background: expiringSoon.length ? 'var(--warn-bg)' : 'var(--bg)', padding: '2px 8px', borderRadius: 6 }}>
              {expiringSoon.length}
            </span>
          } />
          <div style={{ padding: '6px 0' }}>
            {expiringSoon.length === 0 && <Empty text="Sin lotes próximos a vencer." />}
            {expiringSoon.slice(0, 6).map((lot, i) => {
              const days = daysUntil(lot.expiresAt)
              const urgent = days != null && days <= 3
              return (
                <Row key={lot.id} last={i === Math.min(expiringSoon.length, 6) - 1}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lot.productName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lot.availableQuantity} · vence {fmtDate(lot.expiresAt)}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: urgent ? 'var(--neg)' : 'var(--warn)', background: urgent ? 'var(--neg-bg)' : 'var(--warn-bg)', padding: '2px 8px', borderRadius: 6 }}>
                    {days != null ? (days <= 0 ? 'vencido' : `${days} d`) : '—'}
                  </span>
                </Row>
              )
            })}
          </div>
          {expiringSoon.length > 0 && <CardFooter onClick={() => setPage('inventory')} />}
        </Card>
      </div>

      {/* Movimientos recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title="Facturas recientes" action={
            <GhostBtn onClick={() => setPage('invoicing')} style={{ fontSize: 11.5, padding: '5px 10px' }}>Ver todas</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Factura</th><th style={thStyle}>Cliente</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th><th style={thStyle}>Estado</th>
            </tr></thead>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent-text)' }}>{inv.invoiceNumber}</td>
                  <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customerName}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{formatCOP(inv.total)}</td>
                  <td style={tdStyle}><StatusChip status={INVOICE_CHIP[inv.status]?.chip ?? 'muted'} label={INVOICE_CHIP[inv.status]?.label ?? inv.status} /></td>
                </tr>
              ))}
              {recentInvoices.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Aún no hay facturas.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Compras recientes" action={
            <GhostBtn onClick={() => setPage('purchases')} style={{ fontSize: 11.5, padding: '5px 10px' }}>Ver todas</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead><tr>
              <th style={thStyle}>Orden</th><th style={thStyle}>Proveedor</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th><th style={thStyle}>Estado</th>
            </tr></thead>
            <tbody>
              {recentPOs.map(po => (
                <tr key={po.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent-text)' }}>{po.orderNumber}</td>
                  <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.supplierName}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{formatCOP(po.total)}</td>
                  <td style={tdStyle}><StatusChip status={PO_CHIP[po.status]?.chip ?? 'muted'} label={PO_CHIP[po.status]?.label ?? po.status} /></td>
                </tr>
              ))}
              {recentPOs.length === 0 && <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Aún no hay compras.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

// ─── Piezas reutilizables ─────────────────────────────────────────────────────

function Legend({ swatch, text }: { swatch: string; text: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: swatch, display: 'inline-block' }} /> {text}
    </span>
  )
}

function Row({ children, last }: { children: React.ReactNode; last: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>{text}</div>
}

function CardFooter({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
      <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
        Ir a Inventario →
      </button>
    </div>
  )
}
