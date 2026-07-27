import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, CardHeader, KpiCard, StatusChip,
  GhostBtn, PrimaryBtn, Select, tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { accountsPayableApi } from '../procurement/api/accountsPayableApi'
import type { AccountsPayableDto } from '../procurement/api/accountsPayableApi'
import { cashSessionApi } from './cashSessionApi'
import type { CashMovementDto, CashKpisDto, CashSessionDto } from './cashSessionApi'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

const AP_STATUS_COLOR: Record<string, 'ok' | 'warn' | 'info' | 'cancelled'> = {
  PENDING: 'warn', PARTIALLY_PAID: 'info', PAID: 'ok', CANCELLED: 'cancelled',
}
const AP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const MOV_TYPE_LABEL: Record<string, string> = {
  OPENING: 'Apertura', SALE: 'Venta', AP_PAYMENT: 'Pago prov.', EXPENSE: 'Gasto',
  MANUAL_INCOME: 'Ingreso manual', MANUAL_EXPENSE: 'Egreso manual', CLOSING_ADJUSTMENT: 'Ajuste arqueo',
}
const PM_LABEL: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
function isOverdue(d: string | null) {
  return !!d && new Date(d) < new Date()
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9100,
  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modal = (maxW = 440): React.CSSProperties => ({
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 14, width: '100%', maxWidth: maxW,
  boxShadow: '0 8px 40px rgba(0,0,0,0.35)', animation: 'fadeUp 0.18s ease',
})
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 }
const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4,
}
const inputStyle: React.CSSProperties = {
  padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
}

// ─�� Open Session Modal ────────────────────────────────────────────────────────

function OpenSessionModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [opening, setOpening] = useState('300000')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () => cashSessionApi.open({
      openingBalance: parseFloat(opening) || 0,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['cash-history'] })
      toast('Caja abierta', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al abrir caja'
      toast(msg, 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal(400)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Abrir caja</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Saldo inicial (COP)</label>
            <input type="number" value={opening} onChange={e => setOpening(e.target.value)} style={inputStyle} step={1000} min={0} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones de apertura…" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Abriendo���' : 'Abrir caja'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Close Session Modal ───────────────────────────────────────────────────────

function CloseSessionModal({ session, onClose }: { session: CashKpisDto; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [counted, setCounted] = useState(String(Math.round(session.expectedBalance)))
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const countedNum = parseFloat(counted) || 0
  const variance = countedNum - session.expectedBalance
  const varianceColor = variance === 0 ? 'var(--pos)' : variance > 0 ? 'var(--accent)' : 'var(--neg)'
  const needsNotes = variance !== 0 && !notes.trim()

  const mutation = useMutation({
    mutationFn: () => cashSessionApi.close(session.sessionId, {
      countedBalance: countedNum,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['cash-history'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements', session.sessionId] })
      toast('Caja cerrada', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cerrar caja'
      toast(msg, 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal(460)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Cerrar caja — Arqueo</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{session.sessionNumber}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Saldo inicial', formatCOP(session.openingAmount)],
              ['Ventas', formatCOP(session.totalSales)],
              ['Pagos proveedor', formatCOP(session.totalApPayments)],
              ['Gastos', formatCOP(session.totalExpenses)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Saldo esperado</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formatCOP(session.expectedBalance)}</span>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Efectivo contado (COP)</label>
            <input type="number" value={counted} onChange={e => { setCounted(e.target.value); setConfirmed(false) }} style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }} step={1000} min={0} />
          </div>
          {/* Live variance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: `1px solid ${varianceColor}`, background: `color-mix(in srgb, ${varianceColor} 8%, transparent)` }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Diferencia</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: varianceColor }}>
              {variance >= 0 ? '+' : ''}{formatCOP(variance)}
            </span>
          </div>
          {variance !== 0 && (
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--neg)' }}>Notas del arqueo (obligatorio)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Explica la diferencia de arqueo…"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', borderColor: needsNotes ? 'var(--neg)' : 'var(--border)' }}
              />
            </div>
          )}
          {/* Two-step confirm */}
          {!confirmed ? (
            <div style={{ padding: '8px 12px', background: 'color-mix(in srgb, var(--warn) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
              Revisa los valores antes de confirmar el cierre. Esta acción no se puede deshacer.
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          {!confirmed ? (
            <PrimaryBtn onClick={() => setConfirmed(true)} disabled={needsNotes}>
              Continuar
            </PrimaryBtn>
          ) : (
            <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending || needsNotes}>
              {mutation.isPending ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Manual Movement Modal ────────────────────────────────────────────────────

function ManualMovementModal({
  sessionId, direction, onClose,
}: { sessionId: string; direction: 'IN' | 'OUT'; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [description, setDescription] = useState('')

  const isIncome = direction === 'IN'
  const valid = parseFloat(amount) > 0 && description.trim().length > 0

  const mutation = useMutation({
    mutationFn: () => cashSessionApi.createMovement(sessionId, {
      direction,
      amount: parseFloat(amount),
      paymentMethod,
      description: description.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements', sessionId] })
      toast(isIncome ? 'Ingreso registrado' : 'Egreso registrado', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar movimiento'
      toast(msg, 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal(400)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: isIncome ? 'var(--pos)' : 'var(--neg)' }}>
            {isIncome ? '↑ Ingreso manual' : '↓ Egreso manual'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Monto (COP)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} min={1} step={1000} autoFocus />
          </div>
          {isIncome && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Método de pago</label>
              <Select
                value={paymentMethod}
                onChange={v => setPaymentMethod(v as 'CASH' | 'CARD' | 'TRANSFER')}
                options={[
                  { value: 'CASH', label: 'Efectivo' },
                  { value: 'CARD', label: 'Tarjeta' },
                  { value: 'TRANSFER', label: 'Transferencia' },
                ]}
              />
            </div>
          )}
          <div style={fieldStyle}>
            <label style={labelStyle}>Descripción / motivo</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={isIncome ? 'Ej: Cambio de caja chica' : 'Ej: Retiro para depósito bancario'} style={{ ...inputStyle, borderColor: !description.trim() && description ? 'var(--neg)' : 'var(--border)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? 'Registrando…' : `Registrar ${isIncome ? 'ingreso' : 'egreso'}`}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── AP Payment Modal ──────────────────────────────────────────────────────────

function PaymentModal({ ap, onClose }: { ap: AccountsPayableDto; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(String(ap.pendingAmount))
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [notes, setNotes] = useState('')

  const payMutation = useMutation({
    mutationFn: () => accountsPayableApi.pay(ap.id, { amount: parseFloat(amount), paymentMethod, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
      queryClient.invalidateQueries({ queryKey: ['cash-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      toast('Pago registrado', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar pago'
      toast(msg, 'error')
    },
  })

  const numericAmount = parseFloat(amount)
  const validAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= ap.pendingAmount

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal(420)} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Registrar pago</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ap.orderNumber} · {ap.supplierName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['Total OC', formatCOP(ap.totalAmount)], ['Ya pagado', formatCOP(ap.paidAmount)], ['Saldo pendiente', formatCOP(ap.pendingAmount)], ['Vencimiento', formatDate(ap.dueDate)]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Monto a pagar (COP)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, borderColor: !validAmount && amount ? 'var(--neg)' : 'var(--border)' }} min={1} max={ap.pendingAmount} step={1000} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Método de pago</label>
            <Select
              value={paymentMethod}
              onChange={v => setPaymentMethod(v)}
              options={[
                { value: 'Efectivo', label: 'Efectivo' },
                { value: 'Tarjeta', label: 'Tarjeta' },
                { value: 'Transferencia', label: 'Transferencia bancaria' },
                { value: 'Cheque', label: 'Cheque' },
              ]}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Notas (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones…" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => payMutation.mutate()} disabled={!validAmount || payMutation.isPending}>
            {payMutation.isPending ? 'Registrando…' : `Pagar ${validAmount ? formatCOP(numericAmount) : ''}`}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryView() {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-history'],
    queryFn: () => cashSessionApi.getHistory(0, 30),
  })

  const sessions = data?.content ?? []

  return (
    <Card>
      <CardHeader title="Historial de sesiones" />
      <div style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No hay sesiones registradas.</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sesión</th>
                <th style={thStyle}>Abierta por</th>
                <th style={thStyle}>Apertura</th>
                <th style={thStyle}>Cierre</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Saldo inicial</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Saldo esperado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Contado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Diferencia</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: CashSessionDto) => {
                const diff = s.variance ?? 0
                return (
                  <tr key={s.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{s.sessionNumber}</td>
                    <td style={{ ...tdStyle, fontSize: 12.5 }}>{s.openedByName ?? '—'}</td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{formatTime(s.openedAt)}</td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{s.closedAt ? formatTime(s.closedAt) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCOP(s.openingBalance)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.expectedBalance != null ? formatCOP(s.expectedBalance) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.countedBalance != null ? formatCOP(s.countedBalance) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: diff === 0 ? 'var(--pos)' : diff > 0 ? 'var(--accent)' : 'var(--neg)' }}>
                      {s.variance != null ? `${diff >= 0 ? '+' : ''}${formatCOP(diff)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <StatusChip status={s.status === 'OPEN' ? 'confirmed' : 'ok'} label={s.status === 'OPEN' ? 'Abierta' : 'Cerrada'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

type Modal = null | 'open' | 'close' | 'income' | 'expense'

export function CashRegister() {
  const { lang } = useAppStore()
  const t = translations[lang]
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard')
  const [activeModal, setActiveModal] = useState<Modal>(null)
  const [payingAp, setPayingAp] = useState<AccountsPayableDto | null>(null)

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['cash-kpis'],
    queryFn: cashSessionApi.getCurrent,
    refetchInterval: 30_000,
  })

  const isOpen = kpis?.status === 'OPEN'

  const { data: pendingAP = [], isLoading: loadingAP } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: accountsPayableApi.listPending,
    enabled: isOpen,
  })

  const { data: movementsPage, isLoading: loadingMovements } = useQuery({
    queryKey: ['cash-movements', kpis?.sessionId],
    queryFn: () => cashSessionApi.getMovements(kpis!.sessionId, 0, 50),
    enabled: !!kpis?.sessionId,
  })

  const movements = movementsPage?.content ?? []
  const totalPending = pendingAP.reduce((s, ap) => s + ap.pendingAmount, 0)

  // Payment method breakdown from KPIs
  const pmTotal = (kpis?.pmCash ?? 0) + (kpis?.pmCard ?? 0) + (kpis?.pmTransfer ?? 0)
  const paymentMethods = [
    { key: 'CASH', label: 'Efectivo', amount: kpis?.pmCash ?? 0, color: 'var(--accent)' },
    { key: 'CARD', label: 'Tarjeta', amount: kpis?.pmCard ?? 0, color: '#0d9488' },
    { key: 'TRANSFER', label: 'Transferencia', amount: kpis?.pmTransfer ?? 0, color: '#7c3aed' },
  ].filter(pm => pm.amount > 0)

  if (loadingKpis) {
    return (
      <div style={{ padding: '60px 26px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando estado de caja…
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['dashboard', 'history'] as const).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)} style={{
            padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: tab === tabKey ? 'var(--accent)' : 'var(--surface-2)',
            color: tab === tabKey ? '#fff' : 'var(--text-2)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {tabKey === 'dashboard' ? 'Caja activa' : t.cash_history}
          </button>
        ))}
      </div>

      {tab === 'history' && <HistoryView />}

      {tab === 'dashboard' && (
        <>
          {/* Session banner */}
          {isOpen && kpis ? (
            <div style={{
              background: 'var(--pos-bg)', border: '1px solid color-mix(in srgb, var(--pos) 25%, transparent)',
              borderRadius: 12, padding: '14px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pos)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--pos) 25%, transparent)' }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pos)' }}>
                    {t.cash_session_open} · {kpis.sessionNumber}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Abierta por {kpis.openedByName ?? '—'} · Base: {formatCOP(kpis.openingAmount)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <GhostBtn onClick={() => setActiveModal('income')} style={{ fontSize: 12.5, color: 'var(--pos)', borderColor: 'color-mix(in srgb, var(--pos) 30%, transparent)' }}>
                  ↑ {t.btn_income}
                </GhostBtn>
                <GhostBtn onClick={() => setActiveModal('expense')} style={{ fontSize: 12.5, color: 'var(--neg)', borderColor: 'color-mix(in srgb, var(--neg) 30%, transparent)' }}>
                  ↓ {t.btn_expense}
                </GhostBtn>
                <Button variant="danger" requireHold holdDuration={2000} onConfirm={() => setActiveModal('close')}>
                  {t.btn_close_register}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'color-mix(in srgb, var(--warn) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
              borderRadius: 12, padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warn)', marginBottom: 3 }}>Caja cerrada</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Abre la caja para registrar ventas y movimientos del día.</div>
              </div>
              <Button variant="primary" onClick={() => setActiveModal('open')}>
                {t.btn_open_register}
              </Button>
            </div>
          )}

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <KpiCard label={t.cash_opening} value={formatCOP(kpis?.openingAmount ?? 0)} />
            <KpiCard
              label={t.cash_expected}
              value={formatCOP(kpis?.expectedBalance ?? 0)}
              trend={kpis ? `+${formatCOP(kpis.expectedBalance - kpis.openingAmount)}` : undefined}
              trendPositive={kpis ? kpis.expectedBalance >= kpis.openingAmount : undefined}
            />
            <KpiCard label={t.cash_total_sales} value={formatCOP(kpis?.totalSales ?? 0)} />
            <KpiCard
              label={t.cash_variance}
              value={kpis?.status === 'OPEN' ? '—' : formatCOP(0)}
              sub={kpis?.status === 'OPEN' ? 'sesión activa' : 'balanceado'}
            />
          </div>

          {/* AP table */}
          {isOpen && (
            <Card>
              <CardHeader
                title="Cuentas por pagar"
                action={pendingAP.length > 0 ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neg)', background: 'color-mix(in srgb, var(--neg) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--neg) 25%, transparent)', borderRadius: 6, padding: '3px 9px' }}>
                    {formatCOP(totalPending)} pendiente
                  </span>
                ) : undefined}
              />
              <div style={{ overflowX: 'auto' }}>
                {loadingAP ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
                ) : pendingAP.length === 0 ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No hay cuentas por pagar pendientes.</div>
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
                      {pendingAP.map(ap => (
                        <tr key={ap.id}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{ap.supplierName}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{ap.orderNumber}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCOP(ap.totalAmount)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--pos)' }}>{ap.paidAmount > 0 ? formatCOP(ap.paidAmount) : '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--neg)' }}>{formatCOP(ap.pendingAmount)}</td>
                          <td style={{ ...tdStyle, fontSize: 12.5, color: isOverdue(ap.dueDate) ? 'var(--neg)' : 'var(--muted)', fontWeight: isOverdue(ap.dueDate) ? 700 : 400 }}>
                            {formatDate(ap.dueDate)}{isOverdue(ap.dueDate) && <span style={{ marginLeft: 4, fontSize: 11 }}>⚠</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <StatusChip status={AP_STATUS_COLOR[ap.status]} label={AP_STATUS_LABEL[ap.status] ?? ap.status} />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <PrimaryBtn style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => setPayingAp(ap)}>
                              Registrar pago
                            </PrimaryBtn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}

          {/* Bottom row: payment breakdown + movements */}
          {isOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
              {/* Payment method breakdown */}
              <Card>
                <CardHeader title={t.cash_pmtitle} />
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {paymentMethods.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Sin movimientos aún</div>
                  ) : paymentMethods.map(pm => {
                    const pct = pmTotal > 0 ? Math.round((pm.amount / pmTotal) * 100) : 0
                    return (
                      <div key={pm.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{pm.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{formatCOP(pm.amount)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pm.color, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{pct}%</div>
                      </div>
                    )
                  })}
                  {kpis && (kpis.totalApPayments > 0 || kpis.totalExpenses > 0) && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {kpis.totalApPayments > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pagos proveedor</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--neg)' }}>−{formatCOP(kpis.totalApPayments)}</span>
                        </div>
                      )}
                      {kpis.totalExpenses > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Gastos</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--neg)' }}>−{formatCOP(kpis.totalExpenses)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Movements table */}
              <Card>
                <CardHeader title={t.cash_movements} action={
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{kpis?.movementCount ?? 0} movimientos</span>
                } />
                <div style={{ overflowX: 'auto' }}>
                  {loadingMovements ? (
                    <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
                  ) : movements.length === 0 ? (
                    <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin movimientos en esta sesión.</div>
                  ) : (
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Hora</th>
                          <th style={thStyle}>Tipo</th>
                          <th style={thStyle}>Descripción</th>
                          <th style={thStyle}>Método</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m: CashMovementDto) => {
                          const isIn = m.direction === 'IN'
                          return (
                            <tr key={m.id}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>{formatTime(m.createdAt)}</td>
                              <td style={tdStyle}>
                                <StatusChip status={isIn ? 'confirmed' : 'cancelled'} label={MOV_TYPE_LABEL[m.movementType] ?? m.movementType} />
                              </td>
                              <td style={{ ...tdStyle, fontSize: 12.5 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{m.description ?? '—'}</div>
                                {m.reference && <div style={{ fontSize: 11, color: 'var(--accent-text)' }}>{m.reference}</div>}
                              </td>
                              <td style={{ ...tdStyle, fontSize: 12, color: 'var(--muted)' }}>{PM_LABEL[m.paymentMethod] ?? m.paymentMethod}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: isIn ? 'var(--pos)' : 'var(--neg)' }}>
                                {isIn ? '' : '−'}{formatCOP(m.amount)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {activeModal === 'open' && <OpenSessionModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'close' && kpis && (
        <CloseSessionModal session={kpis} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'income' && kpis && (
        <ManualMovementModal sessionId={kpis.sessionId} direction="IN" onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'expense' && kpis && (
        <ManualMovementModal sessionId={kpis.sessionId} direction="OUT" onClose={() => setActiveModal(null)} />
      )}
      {payingAp && (
        <PaymentModal ap={payingAp} onClose={() => setPayingAp(null)} />
      )}
    </div>
  )
}
