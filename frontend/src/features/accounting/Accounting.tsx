import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip,
  GhostBtn, SimpleBarChart,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { accountingMovements, arItems, apItems } from '../../data/mockData'

const cashflowData = [
  { label: 'W1', value: 8400, value2: 5200 },
  { label: 'W2', value: 9200, value2: 6100 },
  { label: 'W3', value: 11800, value2: 7400 },
  { label: 'W4', value: 12826, value2: 4791 },
]

export function Accounting() {
  const { lang } = useAppStore()
  const t = translations[lang]

  const plRows = [
    { label: t.pl_revenue, value: '€12,826.00', bold: false, indent: false },
    { label: t.pl_cogs, value: '−€4,791.25', bold: false, indent: true },
    { label: t.pl_gross, value: '€8,034.75', bold: true, indent: false },
    { label: t.pl_opex, value: '−€4,791.00', bold: false, indent: true },
    { label: t.pl_net, value: '€3,243.75', bold: true, indent: false },
    { label: t.pl_margin, value: '25.3%', bold: false, indent: false },
  ]

  const statusLabelMap: Record<string, string> = {
    issued: t.ss_issued,
    partial: t.ss_partial,
    overdue: t.ss_overdue,
    pending: t.ss_pending,
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* KPIs row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.ac_income} value="€12,826.00" trend="+8.4%" trendPositive sub={t.vs_yesterday} />
        <KpiCard label={t.ac_expenses} value="€4,791.25" trend="+2.1%" trendPositive={false} sub={t.vs_yesterday} />
        <KpiCard label={t.ac_gross} value="€8,034.75" sub={`62.6% ${t.margin}`} />
        <KpiCard label={t.ac_net} value="€3,243.75" sub={`25.3% ${t.margin}`} />
      </div>

      {/* KPIs row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.ac_ar} value="€5,220.00" sub="4 invoices" />
        <KpiCard label={t.ac_ap} value="€8,380.00" sub="3 orders" />
        <KpiCard label={t.ac_cash_balance} value="€2,196.00" trend="+€1,896" trendPositive />
        <KpiCard label={t.ac_inv_val} value="€13,501.75" sub="12 SKUs" />
      </div>

      {/* Charts + P&L */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Cash flow chart */}
        <Card>
          <CardHeader title={`${t.ac_cashflow} · ${t.ac_period}`} action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} /> Income
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--neg)', display: 'inline-block' }} /> Expenses
              </span>
            </div>
          } />
          <div style={{ padding: '16px 18px 12px' }}>
            <SimpleBarChart data={cashflowData} height={160} />
          </div>
        </Card>

        {/* P&L Summary */}
        <Card>
          <CardHeader title={t.ac_pl} action={
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.ac_period}</span>
          } />
          <div style={{ padding: '8px 0' }}>
            {plRows.map((row, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 18px',
                borderBottom: i < plRows.length - 1 ? '1px solid var(--line)' : 'none',
                background: row.bold ? 'var(--accent-weak)' : 'transparent',
              }}>
                <span style={{
                  fontSize: row.bold ? 13.5 : 13,
                  fontWeight: row.bold ? 700 : 400,
                  color: row.bold ? 'var(--text)' : 'var(--text-2)',
                  paddingLeft: row.indent ? 16 : 0,
                }}>
                  {row.indent && <span style={{ color: 'var(--faint)', marginRight: 4 }}>└</span>}
                  {row.label}
                </span>
                <span style={{
                  fontSize: row.bold ? 14 : 13,
                  fontWeight: row.bold ? 700 : 500,
                  color: row.value.startsWith('−') ? 'var(--neg)' : row.value.includes('%') ? 'var(--muted)' : 'var(--text)',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AR + AP tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardHeader title={t.ac_ar_title} action={
            <GhostBtn style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_view_all}</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_customer}</th>
                <th style={thStyle}>{t.th_invoice}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_amount}</th>
                <th style={thStyle}>{t.th_age}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {arItems.map((item, i) => (
                <tr key={i}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{item.customer}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>{item.invoice}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{item.amount}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{item.age}</td>
                  <td style={tdStyle}><StatusChip status={item.status} label={statusLabelMap[item.status] ?? item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title={t.ac_ap_title} action={
            <GhostBtn style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_view_all}</GhostBtn>
          } />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_vendor}</th>
                <th style={thStyle}>{t.th_po}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_amount}</th>
                <th style={thStyle}>{t.th_age}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {apItems.map((item, i) => (
                <tr key={i}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{item.vendor}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>{item.po}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{item.amount}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{item.age}</td>
                  <td style={tdStyle}><StatusChip status={item.status} label={statusLabelMap[item.status] ?? item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader title={t.ac_recent_mov} action={
          <GhostBtn style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_export}</GhostBtn>
        } />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t.th_date}</th>
              <th style={thStyle}>{t.th_reference}</th>
              <th style={thStyle}>{t.th_description}</th>
              <th style={thStyle}>{t.th_account}</th>
              <th style={thStyle}>{t.th_type}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_amount}</th>
            </tr>
          </thead>
          <tbody>
            {accountingMovements.map((mov, i) => (
              <tr key={i}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{mov.date}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>{mov.ref}</td>
                <td style={{ ...tdStyle, color: 'var(--text)' }}>{mov.description}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{mov.account}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: mov.type === 'debit' ? 'var(--neg)' : 'var(--pos)',
                    background: mov.type === 'debit' ? 'var(--neg-bg)' : 'var(--pos-bg)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    textTransform: 'capitalize',
                  }}>{mov.type}</span>
                </td>
                <td style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: mov.type === 'credit' ? 'var(--pos)' : 'var(--neg)',
                }}>{mov.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
