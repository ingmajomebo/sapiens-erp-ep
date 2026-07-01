import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { invoices } from '../../data/mockData'

export function Invoicing() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = invoices.filter((inv) => statusFilter === 'all' || inv.status === statusFilter)

  const statusLabelMap: Record<string, string> = {
    issued: t.ss_issued,
    paid: t.ss_paid,
    partial: t.ss_partial,
    overdue: t.ss_overdue,
    draft: t.ss_draft,
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.ai_outstanding} value="€5,220.00" sub="4 invoices" />
        <KpiCard label={t.ai_overdue} value="€3,240.00" trend="2 invoices" trendPositive={false} />
        <KpiCard label={t.ai_paid_month} value="€1,146.00" trend="+12%" trendPositive />
        <KpiCard label={t.ai_draft} value="1" sub="€1,500.00" />
      </div>

      <Card>
        <CardHeader title={t.nav_invoicing} action={
          <PrimaryBtn onClick={() => openDrawer('invoice')}>+ {t.btn_new_invoice}</PrimaryBtn>
        } />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all', label: t.fil_allstatus },
            { value: 'issued', label: t.ss_issued },
            { value: 'paid', label: t.ss_paid },
            { value: 'partial', label: t.ss_partial },
            { value: 'overdue', label: t.ss_overdue },
            { value: 'draft', label: t.ss_draft },
          ]} />
          <GhostBtn style={{ fontSize: 12, padding: '6px 11px', marginLeft: 'auto' }}>{t.btn_export}</GhostBtn>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_invoice}</th>
                <th style={thStyle}>{t.th_customer}</th>
                <th style={thStyle}>{t.th_related}</th>
                <th style={thStyle}>{t.th_issue}</th>
                <th style={thStyle}>{t.th_due}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_total}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_paid}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_balance}</th>
                <th style={thStyle}>{t.th_status}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{inv.id}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{inv.cust}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{inv.so}</td>
                  <td style={tdStyle}>{inv.issue}</td>
                  <td style={{
                    ...tdStyle,
                    color: inv.status === 'overdue' ? 'var(--neg)' : 'var(--text-2)',
                    fontWeight: inv.status === 'overdue' ? 600 : 400,
                  }}>{inv.due}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{inv.total}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--pos)' }}>{inv.paid}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: parseFloat(inv.balance.replace(/[€,]/g, '')) > 0 ? 'var(--text)' : 'var(--muted)' }}>{inv.balance}</td>
                  <td style={tdStyle}><StatusChip status={inv.status} label={statusLabelMap[inv.status] ?? inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {t.showing} <b style={{ color: 'var(--text-2)' }}>{filtered.length}</b> {t.of} {invoices.length}
          </span>
        </div>
      </Card>
    </div>
  )
}
