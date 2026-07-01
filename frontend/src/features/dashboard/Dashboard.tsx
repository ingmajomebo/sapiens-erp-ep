import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  KpiCard, Card, CardHeader, SimpleBarChart, CategoryLegend,
  Tile, StatusChip, GhostBtn, tableStyle, tdStyle, thStyle,
} from '../../shared/helpers'
import {
  topProducts, lowStockItems, expiringItems, recentSales, recentPurchases,
} from '../../data/mockData'

const chartData = [
  { label: 'Mon', value: 3200, value2: 1800 },
  { label: 'Tue', value: 4100, value2: 2100 },
  { label: 'Wed', value: 3800, value2: 1900 },
  { label: 'Thu', value: 5200, value2: 2400 },
  { label: 'Fri', value: 6800, value2: 2600 },
  { label: 'Sat', value: 8400, value2: 3100 },
  { label: 'Sun', value: 7200, value2: 2800 },
]

const catData = [
  { label: 'Fresh fish', value: 45, color: '#0d9488' },
  { label: 'Shellfish', value: 30, color: '#2563eb' },
  { label: 'Frozen', value: 15, color: '#7c3aed' },
  { label: 'Smoked', value: 10, color: '#ea580c' },
]

export function Dashboard() {
  const { lang, setPage, openDrawer } = useAppStore()
  const t = translations[lang]

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.25s ease' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.kpi_revenue} value="€12,826" trend="+8.4%" trendPositive sub={t.vs_yesterday} />
        <KpiCard label={t.kpi_expenses} value="€4,791" trend="+2.1%" trendPositive={false} sub={t.vs_yesterday} />
        <KpiCard label={t.kpi_gross} value="€8,035" sub={`62.6% ${t.margin}`} />
        <KpiCard label={t.kpi_invvalue} value="€13,501.75" sub="12 SKUs" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title={t.card_salesexp} action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} /> Sales
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--neg)', display: 'inline-block' }} /> Expenses
              </span>
            </div>
          } />
          <div style={{ padding: '16px 18px 12px' }}>
            <SimpleBarChart data={chartData} height={160} />
          </div>
        </Card>

        <Card>
          <CardHeader title={t.card_invcat} />
          <div style={{ padding: '16px 18px' }}>
            <CategoryLegend items={catData} />
          </div>
        </Card>
      </div>

      {/* Middle row: top products + low stock + expiring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title={t.card_topproducts} action={
            <GhostBtn onClick={() => setPage('inventory')} style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_view_all}</GhostBtn>
          } />
          <div style={{ padding: '8px 0 8px' }}>
            {topProducts.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                borderBottom: i < topProducts.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <Tile initial={p.initial} tile={p.tile} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.qty}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{p.amount}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.card_lowstock} action={
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--neg)', background: 'var(--neg-bg)', padding: '2px 8px', borderRadius: 6 }}>4</span>
          } />
          <div style={{ padding: '8px 0 8px' }}>
            {lowStockItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 16px',
                borderBottom: i < lowStockItems.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.wh}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warn)' }}>{item.qty}</div>
                  <button style={{
                    fontSize: 10.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)',
                    border: 'none', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit',
                  }} onClick={() => openDrawer('po')}>{t.reorder}</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t.card_expiring} action={
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-bg)', padding: '2px 8px', borderRadius: 6 }}>4</span>
          } />
          <div style={{ padding: '8px 0 8px' }}>
            {expiringItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 16px',
                borderBottom: i < expiringItems.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.lot} · {item.qty}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: item.urgency === 'today' ? 'var(--neg)' : 'var(--warn)',
                  background: item.urgency === 'today' ? 'var(--neg-bg)' : 'var(--warn-bg)',
                  padding: '2px 8px', borderRadius: 6,
                }}>
                  {item.urgency}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row: recent sales + recent purchases */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title={t.card_recentsales} action={
            <GhostBtn onClick={() => setPage('sales')} style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_view_all}</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_order}</th>
                <th style={thStyle}>{t.th_customer}</th>
                <th style={thStyle}>{t.th_total}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s, i) => (
                <tr key={i}>
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{s.id}</span></td>
                  <td style={tdStyle}>{s.cust}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{s.total}</td>
                  <td style={tdStyle}><StatusChip status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title={t.card_recentpurchases} action={
            <GhostBtn onClick={() => setPage('purchases')} style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_view_all}</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_po}</th>
                <th style={thStyle}>{t.th_supplier}</th>
                <th style={thStyle}>{t.th_total}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((p, i) => (
                <tr key={i}>
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{p.id}</span></td>
                  <td style={tdStyle}>{p.sup}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{p.total}</td>
                  <td style={tdStyle}><StatusChip status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
