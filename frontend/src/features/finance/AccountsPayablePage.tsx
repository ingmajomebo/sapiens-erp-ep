import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsPayableApi, type AccountsPayableDto, type SupplierPaymentDto } from '../procurement/api/accountsPayableApi'
import { cashBanksApi, type FinancialAccountDto } from './api/cashBanksApi'
import {
  Card, CardHeader, KpiCard, StatusChip, GhostBtn, PrimaryBtn,
  FilterSelect, Select, PaginationFooter, tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'

const today = new Date().toISOString().slice(0, 10)

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'Otro']

const AP_STATUS_LABEL: Record<string, string> = {
  PENDING:          'Pendiente',
  PARTIALLY_PAID:   'Parcialmente pagada',
  PAID:             'Pagada',
  CANCELLED:        'Anulada',
  OVERDUE:          'Vencida',
}
const AP_STATUS_COLOR: Record<string, string> = {
  PENDING:          'warn',
  PARTIALLY_PAID:   'warn',
  PAID:             'ok',
  CANCELLED:        'cancelled',
  OVERDUE:          'overdue',
}

type ModalMode = 'detail' | 'pay' | 'history'

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
  width: '92vw', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const,
}
const sectionLabel = (text: string) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>
    {text}
  </div>
)

function APModal({ ap, mode: initMode, onClose }: {
  ap: AccountsPayableDto
  mode: ModalMode
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(initMode)

  // Payment form state
  const [payAmount, setPayAmount]           = useState('')
  const [payDate, setPayDate]               = useState(today)
  const [payMethod, setPayMethod]           = useState('')
  const [payAccountId, setPayAccountId]     = useState('')
  const [paySupplierAcc, setPaySupplierAcc] = useState('')
  const [payRef, setPayRef]                 = useState('')
  const [payNotes, setPayNotes]             = useState('')

  const { data: payments = [] } = useQuery<SupplierPaymentDto[]>({
    queryKey: ['ap-payments', ap.id],
    queryFn: () => accountsPayableApi.getPayments(ap.id),
    enabled: mode === 'history',
  })

  const { data: accounts = [] } = useQuery<FinancialAccountDto[]>({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
    enabled: mode === 'pay',
  })

  const payMutation = useMutation({
    mutationFn: () => accountsPayableApi.pay(ap.id, {
      amount: parseFloat(payAmount),
      paymentDate: payDate || null,
      paymentMethod: payMethod || null,
      paymentOrigin: accounts.find(a => a.id === payAccountId)?.name ?? null,
      supplierAccount: paySupplierAcc.trim() || null,
      referenceNumber: payRef.trim() || null,
      notes: payNotes.trim() || null,
      financialAccountId: payAccountId || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts-payable'] })
      qc.invalidateQueries({ queryKey: ['financial-accounts'] })
      toast('Pago registrado correctamente', 'success')
      onClose()
    },
    onError: (err: Error) => toast(err.message ?? 'Error al registrar el pago', 'error'),
  })

  const busy = payMutation.isPending
  const parsedAmount = parseFloat(payAmount)
  const amountValid = payAmount !== '' && parsedAmount > 0 && parsedAmount <= ap.pendingAmount
  const canPay = amountValid && !busy

  // ── HEADER shared
  const ModalHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1, marginTop: 2 }}>×</button>
    </div>
  )

  // ── AP info cards (shared between detail and pay mode)
  const APInfoCards = () => (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
      padding: '12px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)',
    }}>
      {[
        { label: 'Total factura',   value: formatCOP(ap.totalAmount),   color: 'var(--text)' },
        { label: 'Total pagado',    value: formatCOP(ap.paidAmount),    color: 'var(--pos)' },
        { label: 'Saldo pendiente', value: formatCOP(ap.pendingAmount), color: 'var(--neg)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
    </div>
  )

  // ── DETAIL MODE
  if (mode === 'detail') {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <ModalHeader
            title={ap.invoiceNumber ?? 'Factura'}
            sub={`${ap.supplierName} · ${ap.orderNumber}`}
          />
          <APInfoCards />
          <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
            {/* Supplier / PO info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              {[
                { label: 'Proveedor',         value: ap.supplierName },
                { label: 'Orden de compra',    value: ap.orderNumber },
                { label: 'Fecha vencimiento',  value: ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('es-CO') : '—' },
                { label: 'Estado',             value: <StatusChip status={AP_STATUS_COLOR[ap.status]} label={AP_STATUS_LABEL[ap.status] ?? ap.status} /> },
              ].map(({ label, value }) => (
                <div key={label}>
                  {sectionLabel(label)}
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <GhostBtn onClick={() => setMode('history')}>Historial de pagos</GhostBtn>
            {ap.status !== 'PAID' && ap.status !== 'CANCELLED' && (
              <PrimaryBtn onClick={() => setMode('pay')}>Registrar pago</PrimaryBtn>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── HISTORY MODE
  if (mode === 'history') {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <ModalHeader title="Historial de pagos" sub={ap.invoiceNumber ?? ap.supplierName} />
          <APInfoCards />
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {payments.length === 0 ? (
              <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Sin pagos registrados aún.
              </div>
            ) : (
              <table style={{ ...tableStyle, fontSize: 12.5 }}>
                <thead>
                  <tr>
                    {['Fecha', 'Monto', 'Método', 'Cuenta origen', 'Referencia'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{p.paymentDate}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--pos)' }}>{formatCOP(p.amount)}</td>
                      <td style={tdStyle}>{p.paymentMethod ?? '—'}</td>
                      <td style={tdStyle}>{p.paymentOrigin ?? '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{p.referenceNumber ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <GhostBtn onClick={() => setMode('detail')}>Volver al detalle</GhostBtn>
            {ap.status !== 'PAID' && ap.status !== 'CANCELLED' && (
              <PrimaryBtn onClick={() => setMode('pay')}>Registrar pago</PrimaryBtn>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── PAY MODE
  const sel: React.CSSProperties = { ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <ModalHeader
          title="Registrar pago"
          sub={`${ap.invoiceNumber ?? ''} · ${ap.supplierName}`}
        />
        <APInfoCards />

        <div style={{ padding: '18px 22px 6px', overflowY: 'auto' }}>

          {/* Row 1: amount + date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              {sectionLabel('Monto a pagar *')}
              <input type="number" min={0.01} step={0.01} max={ap.pendingAmount}
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder={`Máx. ${formatCOP(ap.pendingAmount)}`}
                style={{ ...inputStyle, ...(payAmount && !amountValid ? { borderColor: 'var(--neg)' } : {}) }} />
              {payAmount && !amountValid && (
                <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 4 }}>
                  {parsedAmount > ap.pendingAmount ? `Máximo ${formatCOP(ap.pendingAmount)}` : 'Ingresa un monto válido'}
                </div>
              )}
            </div>
            <div>
              {sectionLabel('Fecha del pago *')}
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Row 2: method + financial account */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              {sectionLabel('Método de pago')}
              <Select
                style={{ width: '100%' }}
                value={payMethod}
                onChange={v => setPayMethod(v)}
                options={[
                  { value: '', label: '— Seleccionar —' },
                  ...PAYMENT_METHODS.map(m => ({ value: m, label: m })),
                ]}
              />
            </div>
            <div>
              {sectionLabel('Caja / Banco origen')}
              <Select
                style={{ width: '100%' }}
                value={payAccountId}
                onChange={v => setPayAccountId(v)}
                options={[
                  { value: '', label: '— Seleccionar cuenta —' },
                  ...accounts.map(a => ({ value: a.id, label: `${a.name} (${formatCOP(a.currentBalance)})` })),
                ]}
              />
            </div>
          </div>

          {/* Supplier account */}
          <div style={{ marginBottom: 14 }}>
            {sectionLabel('Cuenta destino del proveedor (opcional)')}
            <input type="text" value={paySupplierAcc} onChange={e => setPaySupplierAcc(e.target.value)}
              placeholder="Ej: Bancolombia · Cta. Ahorro · 123-456789-00" style={inputStyle} />
          </div>

          {/* Reference */}
          <div style={{ marginBottom: 14 }}>
            {sectionLabel('Comprobante / referencia (opcional)')}
            <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)}
              placeholder="Ej: TRF-20260628-001" style={inputStyle} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            {sectionLabel('Observación (opcional)')}
            <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
              placeholder="Notas adicionales sobre este pago…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={() => setMode('detail')} disabled={busy}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => payMutation.mutate()} disabled={!canPay}>
            {payMutation.isPending ? 'Registrando…' : 'Registrar pago'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

export function AccountsPayablePage() {
  const [statusFilter, setStatusFilter]     = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [apSearch, setApSearch]             = useState('')
  const [apPage, setApPage]                 = useState(0)
  const PAGE_SIZE = 12
  const [selectedAp, setSelectedAp]         = useState<AccountsPayableDto | null>(null)
  const [modalMode, setModalMode]           = useState<ModalMode>('detail')

  const { data: invoices = [], isLoading } = useQuery<AccountsPayableDto[]>({
    queryKey: ['accounts-payable'],
    queryFn: accountsPayableApi.listAll,
  })

  const supplierNames = Array.from(new Set(invoices.map(a => a.supplierName))).sort()

  const apq = apSearch.trim().toLowerCase()
  const filtered = invoices.filter(ap => {
    const matchStatus   = statusFilter === 'all' || ap.status === statusFilter
    const matchSupplier = supplierFilter === '' || ap.supplierName === supplierFilter
    const matchSearch   = !apq
      || (ap.invoiceNumber ?? '').toLowerCase().includes(apq)
      || ap.orderNumber.toLowerCase().includes(apq)
      || ap.supplierName.toLowerCase().includes(apq)
    return matchStatus && matchSupplier && matchSearch
  })
  const paged = filtered.slice(apPage * PAGE_SIZE, (apPage + 1) * PAGE_SIZE)

  const totalPending  = invoices.reduce((s, a) => s + (a.status !== 'PAID' && a.status !== 'CANCELLED' ? a.pendingAmount : 0), 0)
  const totalPaid     = invoices.reduce((s, a) => s + a.paidAmount, 0)
  const overdueCount  = invoices.filter(a => a.status === 'OVERDUE').length
  const thisMonthCnt  = invoices.filter(a => {
    if (!a.createdAt) return false
    const d = new Date(a.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const openModal = (ap: AccountsPayableDto, mode: ModalMode) => {
    setSelectedAp(ap)
    setModalMode(mode)
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Total pendiente"      value={formatCOP(totalPending)} />
        <KpiCard label="Total pagado"         value={formatCOP(totalPaid)} trendPositive />
        <KpiCard label="Facturas vencidas"    value={String(overdueCount)} trendPositive={overdueCount === 0} trend={overdueCount > 0 ? `${overdueCount} vencida${overdueCount > 1 ? 's' : ''}` : undefined} />
        <KpiCard label="Facturas este mes"    value={String(thisMonthCnt)} sub={`de ${invoices.length} total`} />
      </div>

      <Card>
        <CardHeader title="Facturas de proveedores" />

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <input
            value={apSearch}
            onChange={e => { setApSearch(e.target.value); setApPage(0) }}
            placeholder="Buscar por factura, OC o proveedor…"
            style={{
              width: 250, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
            }}
          />
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setApPage(0) }} options={[
            { value: 'all',             label: 'Todos los estados' },
            { value: 'PENDING',         label: 'Pendiente' },
            { value: 'PARTIALLY_PAID',  label: 'Parcialmente pagada' },
            { value: 'PAID',            label: 'Pagada' },
            { value: 'OVERDUE',         label: 'Vencida' },
            { value: 'CANCELLED',       label: 'Anulada' },
          ]} />
          <FilterSelect
            value={supplierFilter}
            onChange={v => { setSupplierFilter(v); setApPage(0) }}
            options={[
              { value: '', label: 'Todos los proveedores' },
              ...supplierNames.map(n => ({ value: n, label: n })),
            ]}
          />
          {(statusFilter !== 'all' || supplierFilter !== '' || apSearch !== '') && (
            <button
              onClick={() => { setStatusFilter('all'); setSupplierFilter(''); setApSearch(''); setApPage(0) }}
              style={{
                padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--muted)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Limpiar filtros ×
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>
            {filtered.length} factura{filtered.length !== 1 ? 's' : ''}
            {supplierFilter && <strong style={{ color: 'var(--text-2)' }}> · {supplierFilter}</strong>}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Cargando facturas…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No hay facturas con este filtro.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}># Factura</th>
                  <th style={thStyle}>Proveedor</th>
                  <th style={thStyle}>OC</th>
                  <th style={thStyle}>Vencimiento</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Pagado</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Pendiente</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(ap => (
                  <tr key={ap.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => openModal(ap, 'detail')}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--accent-text)' }}>
                        {ap.invoiceNumber ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{ap.supplierName}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: 'var(--muted)' }}>{ap.orderNumber}</td>
                    <td style={{
                      ...tdStyle,
                      color: ap.status === 'OVERDUE' ? 'var(--neg)' : 'var(--text-2)',
                      fontWeight: ap.status === 'OVERDUE' ? 600 : 400,
                    }}>
                      {ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCOP(ap.totalAmount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--pos)' }}>{formatCOP(ap.paidAmount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: ap.pendingAmount > 0 ? 'var(--neg)' : 'var(--muted)' }}>
                      {formatCOP(ap.pendingAmount)}
                    </td>
                    <td style={tdStyle}>
                      <StatusChip status={AP_STATUS_COLOR[ap.status] ?? 'muted'} label={AP_STATUS_LABEL[ap.status] ?? ap.status} />
                    </td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <GhostBtn style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => openModal(ap, 'detail')}>
                          Detalle
                        </GhostBtn>
                        {ap.status !== 'PAID' && ap.status !== 'CANCELLED' && (
                          <GhostBtn style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => openModal(ap, 'pay')}>
                            Pagar
                          </GhostBtn>
                        )}
                        <GhostBtn style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => openModal(ap, 'history')}>
                          Historial
                        </GhostBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <PaginationFooter total={filtered.length} page={apPage} pageSize={PAGE_SIZE}
          onPage={setApPage} unit="facturas" />
      </Card>

      {selectedAp && (
        <APModal
          ap={selectedAp}
          mode={modalMode}
          onClose={() => setSelectedAp(null)}
        />
      )}
    </div>
  )
}
