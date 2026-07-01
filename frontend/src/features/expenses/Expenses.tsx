import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip, Tile,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { expenses } from '../../data/mockData'

const catColors: Record<string, string> = {
  Payroll: 'blue',
  Supplies: 'teal',
  Utilities: 'orange',
  Rent: 'purple',
  Logistics: 'green',
  Maintenance: 'red',
  Other: 'teal',
}

export function Expenses() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]
  const [catFilter, setCatFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')

  const filtered = expenses.filter((exp) => {
    const matchCat = catFilter === 'all' || exp.cat === catFilter
    const matchMethod = methodFilter === 'all' || exp.method === methodFilter
    return matchCat && matchMethod
  })

  const statusLabelMap: Record<string, string> = {
    paid: t.ss_paid,
    pending: t.ss_pending,
    draft: t.ss_draft,
  }

  const catLabelMap: Record<string, string> = {
    Payroll: t.ecat_payroll,
    Supplies: t.ecat_supplies,
    Utilities: t.ecat_utilities,
    Rent: t.ecat_rent,
    Logistics: t.ecat_logistics,
    Maintenance: t.ecat_maintenance,
    Other: t.ecat_other,
  }

  const byMethod = expenses.reduce<Record<string, number>>((acc, e) => {
    const val = parseFloat(e.amount.replace(/[€,]/g, ''))
    acc[e.method] = (acc[e.method] ?? 0) + val
    return acc
  }, {})

  const totalMonth = expenses.reduce((s, e) => s + parseFloat(e.amount.replace(/[€,]/g, '')), 0)
  const pendingAmt = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + parseFloat(e.amount.replace(/[€,]/g, '')), 0)

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.ex_month} value={`€${totalMonth.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="June 2026" />
        <KpiCard label={t.ex_top_cat} value={t.ecat_payroll} sub="€1,800.00" />
        <KpiCard label={t.ex_pending} value={`€${pendingAmt.toLocaleString('en', { minimumFractionDigits: 2 })}`} trend="2 items" trendPositive={false} />
        <KpiCard label={t.ex_by_method} value="Transfer" sub="€4,180.00 (55%)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* Main table */}
        <Card>
          <CardHeader title={t.nav_expenses} action={
            <PrimaryBtn onClick={() => openDrawer('expense')}>+ {t.btn_new_expense}</PrimaryBtn>
          } />

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <FilterSelect value={catFilter} onChange={setCatFilter} options={[
              { value: 'all', label: t.ef_category },
              { value: 'Payroll', label: t.ecat_payroll },
              { value: 'Supplies', label: t.ecat_supplies },
              { value: 'Utilities', label: t.ecat_utilities },
              { value: 'Rent', label: t.ecat_rent },
              { value: 'Logistics', label: t.ecat_logistics },
              { value: 'Maintenance', label: t.ecat_maintenance },
              { value: 'Other', label: t.ecat_other },
            ]} />
            <FilterSelect value={methodFilter} onChange={setMethodFilter} options={[
              { value: 'all', label: t.ef_method },
              { value: 'Transfer', label: 'Transfer' },
              { value: 'Cash', label: 'Cash' },
              { value: 'Card', label: 'Card' },
              { value: 'Direct debit', label: 'Direct debit' },
            ]} />
            <GhostBtn style={{ fontSize: 12, padding: '6px 11px', marginLeft: 'auto' }}>{t.btn_export}</GhostBtn>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.th_date}</th>
                  <th style={thStyle}>{t.ef_category}</th>
                  <th style={thStyle}>{t.th_description}</th>
                  <th style={thStyle}>{t.th_vendor}</th>
                  <th style={thStyle}>{t.th_method}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_amount}</th>
                  <th style={thStyle}>{t.th_status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, i) => (
                  <tr key={i}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{exp.date}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Tile initial={exp.initial} tile={catColors[exp.cat] ?? 'teal'} size={22} />
                        <span style={{ fontSize: 12.5 }}>{catLabelMap[exp.cat] ?? exp.cat}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text)' }}>{exp.desc}</td>
                    <td style={tdStyle}>{exp.vendor}</td>
                    <td style={tdStyle}>{exp.method}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--neg)' }}>{exp.amount}</td>
                    <td style={tdStyle}><StatusChip status={exp.status} label={statusLabelMap[exp.status] ?? exp.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 18px' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {t.showing} <b style={{ color: 'var(--text-2)' }}>{filtered.length}</b> {t.of} {expenses.length}
            </span>
          </div>
        </Card>

        {/* By payment method breakdown */}
        <Card>
          <CardHeader title={t.ex_by_method} />
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(byMethod).map(([method, amt]) => (
              <div key={method}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{method}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>€{amt.toFixed(2)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(amt / totalMonth) * 100}%`,
                    background: method === 'Transfer' ? 'var(--accent)' : method === 'Cash' ? '#0d9488' : method === 'Direct debit' ? '#7c3aed' : '#ea580c',
                    borderRadius: 3,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {Math.round((amt / totalMonth) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
