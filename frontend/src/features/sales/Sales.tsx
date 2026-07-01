import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { salesOrders } from '../../data/mockData'

export function Sales() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = salesOrders.filter((so) => statusFilter === 'all' || so.status === statusFilter)

  const statusLabelMap: Record<string, string> = {
    pending: t.ss_pending,
    confirmed: t.ss_confirmed,
    delivered: t.ss_delivered,
    cancelled: t.ss_cancelled,
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.sa_revenue} value="€12,826" trend="+8.4%" trendPositive sub={t.vs_yesterday} />
        <KpiCard label={t.sa_orders} value="6" sub="this week" />
        <KpiCard label={t.sa_avg} value="€635" sub="per order" />
        <KpiCard label={t.sa_units} value="312 kg" sub="this month" />
      </div>

      <Card>
        <CardHeader title={t.nav_sales} action={
          <PrimaryBtn onClick={() => openDrawer('sale')}>+ {t.btn_new_sale}</PrimaryBtn>
        } />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all', label: t.fil_allstatus },
            { value: 'pending', label: t.ss_pending },
            { value: 'confirmed', label: t.ss_confirmed },
            { value: 'delivered', label: t.ss_delivered },
            { value: 'cancelled', label: t.ss_cancelled },
          ]} />
          <GhostBtn style={{ fontSize: 12, padding: '6px 11px', marginLeft: 'auto' }}>{t.btn_export}</GhostBtn>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_order}</th>
                <th style={thStyle}>{t.th_customer}</th>
                <th style={thStyle}>{t.th_date}</th>
                <th style={thStyle}>{t.th_items}</th>
                <th style={thStyle}>{t.th_total}</th>
                <th style={thStyle}>{t.th_payment}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((so, i) => (
                <tr key={i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{so.id}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{so.cust}</td>
                  <td style={tdStyle}>{so.date}</td>
                  <td style={tdStyle}>{so.items}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{so.total}</td>
                  <td style={tdStyle}>{so.pay}</td>
                  <td style={tdStyle}><StatusChip status={so.status} label={statusLabelMap[so.status] ?? so.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {t.showing} <b style={{ color: 'var(--text-2)' }}>{filtered.length}</b> {t.of} {salesOrders.length}
          </span>
        </div>
      </Card>
    </div>
  )
}
