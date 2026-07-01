import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, CardHeader, KpiCard, StatusChip,
  GhostBtn, PrimaryBtn, tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { cashMovements } from '../../data/mockData'
import { accountsPayableApi } from '../procurement/api/accountsPayableApi'
import type { AccountsPayableDto } from '../procurement/api/accountsPayableApi'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'

const AP_STATUS_COLOR: Record<string, 'ok' | 'warn' | 'info' | 'cancelled'> = {
  PENDING: 'warn',
  PARTIALLY_PAID: 'info',
  PAID: 'ok',
  CANCELLED: 'cancelled',
}

const AP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dueDateStr: string | null) {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date()
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

interface PaymentModalProps {
  ap: AccountsPayableDto
  onClose: () => void
}

function PaymentModal({ ap, onClose }: PaymentModalProps) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(String(ap.pendingAmount))
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')

  const payMutation = useMutation({
    mutationFn: () => accountsPayableApi.pay(ap.id, {
      amount: parseFloat(amount),
      paymentMethod,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
      toast('Pago registrado', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar pago'
      toast(msg, 'error')
    },
  })

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9100,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }

  const modal: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, width: '100%', maxWidth: 420,
    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
    animation: 'fadeUp 0.18s ease',
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 5,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: 0.4,
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit',
    outline: 'none',
  }

  const numericAmount = parseFloat(amount)
  const validAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= ap.pendingAmount

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 12px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Registrar pago</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ap.orderNumber} · {ap.supplierName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>
            ×
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            {[
              ['Total OC', formatCOP(ap.totalAmount)],
              ['Ya pagado', formatCOP(ap.paidAmount)],
              ['Saldo pendiente', formatCOP(ap.pendingAmount)],
              ['Vencimiento', formatDate(ap.dueDate)],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Monto a pagar (COP)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ ...inputStyle, borderColor: !validAmount && amount ? 'var(--neg)' : 'var(--border)' }}
              min={1}
              max={ap.pendingAmount}
              step={1000}
            />
            {!validAmount && amount && (
              <span style={{ fontSize: 11, color: 'var(--neg)' }}>
                El monto debe ser entre $ 1 y {formatCOP(ap.pendingAmount)}
              </span>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={inputStyle}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia bancaria</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del pago…"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '12px 20px', borderTop: '1px solid var(--border)',
        }}>
          <GhostBtn onClick={onClose} style={{ fontSize: 13 }}>Cancelar</GhostBtn>
          <PrimaryBtn
            onClick={() => payMutation.mutate()}
            disabled={!validAmount || payMutation.isPending}
          >
            {payMutation.isPending ? 'Registrando…' : `Pagar ${validAmount ? formatCOP(numericAmount) : ''}`}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CashRegister() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]
  const [payingAp, setPayingAp] = useState<AccountsPayableDto | null>(null)

  const { data: pendingAP = [], isLoading: loadingAP } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: accountsPayableApi.listPending,
  })

  const paymentMethods = [
    { method: 'Cash', amount: '€1,716.00', pct: 52 },
    { method: 'Card', amount: '€624.00', pct: 28 },
    { method: 'Transfer', amount: '€480.00', pct: 20 },
  ]

  const totalPending = pendingAP.reduce((s, ap) => s + ap.pendingAmount, 0)

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* Session banner */}
      <div style={{
        background: 'var(--pos-bg)',
        border: '1px solid color-mix(in srgb, var(--pos) 25%, transparent)',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--pos)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--pos) 25%, transparent)',
          }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pos)' }}>{t.cash_session_open}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.cash_openedby}</div>
          </div>
        </div>
        <Button
          variant="danger"
          requireHold
          holdDuration={2000}
          onConfirm={() => openDrawer('closeRegister')}
          title="Hold to close register"
        >
          {t.btn_close_register}
        </Button>
      </div>

      {/* Balance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.cash_opening} value="€300.00" />
        <KpiCard label={t.cash_current} value="€2,196.00" trend="+€1,896.00" trendPositive />
        <KpiCard label={t.cash_expected} value="€2,196.00" />
        <KpiCard label={t.cash_variance} value="€0.00" sub="balanced" />
      </div>

      {/* Cuentas por pagar */}
      <Card>
        <CardHeader
          title="Cuentas por pagar"
          action={
            pendingAP.length > 0 ? (
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--neg)',
                background: 'color-mix(in srgb, var(--neg) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--neg) 25%, transparent)',
                borderRadius: 6, padding: '3px 9px',
              }}>
                {formatCOP(totalPending)} pendiente
              </span>
            ) : undefined
          }
        />
        <div style={{ overflowX: 'auto' }}>
          {loadingAP ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
          ) : pendingAP.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No hay cuentas por pagar pendientes.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Proveedor</th>
                  <th style={thStyle}>OC Nº</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Pagado</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Pendiente</th>
                  <th style={thStyle}>Vencimiento</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Estado</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {pendingAP.map((ap) => (
                  <tr
                    key={ap.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{ap.supplierName}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>
                      {ap.orderNumber}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCOP(ap.totalAmount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--pos)' }}>
                      {ap.paidAmount > 0 ? formatCOP(ap.paidAmount) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--neg)' }}>
                      {formatCOP(ap.pendingAmount)}
                    </td>
                    <td style={{
                      ...tdStyle, fontSize: 12.5,
                      color: isOverdue(ap.dueDate) ? 'var(--neg)' : 'var(--muted)',
                      fontWeight: isOverdue(ap.dueDate) ? 700 : 400,
                    }}>
                      {formatDate(ap.dueDate)}
                      {isOverdue(ap.dueDate) && <span style={{ marginLeft: 4, fontSize: 11 }}>⚠</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <StatusChip status={AP_STATUS_COLOR[ap.status]} label={AP_STATUS_LABEL[ap.status] ?? ap.status} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <PrimaryBtn
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => setPayingAp(ap)}
                      >
                        Registrar pago
                      </PrimaryBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pendingAP.length > 0 && (
          <div style={{ padding: '10px 18px' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {pendingAP.length} cuenta{pendingAP.length !== 1 ? 's' : ''} pendiente{pendingAP.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </Card>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        {/* By payment method */}
        <Card>
          <CardHeader title={t.cash_pmtitle} />
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {paymentMethods.map((pm) => (
              <div key={pm.method}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{pm.method}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{pm.amount}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pm.pct}%`,
                    background: pm.method === 'Cash' ? 'var(--accent)' : pm.method === 'Card' ? '#0d9488' : '#7c3aed',
                    borderRadius: 3,
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{pm.pct}%</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cash movements table */}
        <Card>
          <CardHeader title={t.cash_movements} action={
            <GhostBtn style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_export}</GhostBtn>
          } />
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.th_time}</th>
                  <th style={thStyle}>{t.th_type}</th>
                  <th style={thStyle}>{t.th_reference}</th>
                  <th style={thStyle}>{t.th_method}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_amount}</th>
                </tr>
              </thead>
              <tbody>
                {cashMovements.map((m, i) => (
                  <tr key={i}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{m.time}</td>
                    <td style={tdStyle}>
                      <StatusChip status={m.pos ? 'confirmed' : 'cancelled'} label={m.type} />
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--accent-text)', fontSize: 12.5, fontWeight: 600 }}>{m.ref}</td>
                    <td style={tdStyle}>{m.method}</td>
                    <td style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: m.pos ? 'var(--pos)' : 'var(--neg)',
                    }}>{m.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Payment modal */}
      {payingAp && (
        <PaymentModal
          ap={payingAp}
          onClose={() => setPayingAp(null)}
        />
      )}
    </div>
  )
}
