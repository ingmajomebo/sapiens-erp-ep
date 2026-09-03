import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidarVentas } from '../../api/invalidarVentas'
import { PrimaryBtn, GhostBtn, Select } from '../../shared/helpers'
import { toast, toastLoading, toastResolve } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import { cashBanksApi } from '../finance/api/cashBanksApi'
import { receivablesApi, type PaymentReceiptDto, type ReceivableDto, type ReceiptPaymentMethod } from './api/receivablesApi'

const METHOD_LABELS: Record<ReceiptPaymentMethod, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelSm: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4,
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}

const fmtDate = (v: string) =>
  new Date(v + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * Mutación del recibo con preload: muestra un toast con spinner mientras se
 * registra y lo resuelve en el mismo toast con check verde (o error) al terminar.
 */
function useReceiptMutation(onClose: () => void, onSaved?: () => void,
                            successMessage?: (rc: PaymentReceiptDto) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: receivablesApi.createReceipt,
    onMutate: () => ({ toastId: toastLoading('Registrando pago…') }),
    onSuccess: (rc, _vars, ctx) => {
      invalidarVentas(queryClient)
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toastResolve(ctx.toastId,
        successMessage?.(rc) ?? `Recibo ${rc.number} registrado por ${formatCOP(rc.amount)}`,
        'success')
      onSaved?.()
      onClose()
    },
    onError: (e: { response?: { data?: { message?: string } } }, _vars, ctx) =>
      toastResolve(ctx?.toastId ?? -1, e.response?.data?.message ?? 'No se pudo registrar el abono', 'error'),
  })
}

function CommonFields({ method, setMethod, accountId, setAccountId, reference, setReference }: {
  method: ReceiptPaymentMethod; setMethod: (m: ReceiptPaymentMethod) => void
  accountId: string; setAccountId: (v: string) => void
  reference: string; setReference: (v: string) => void
}) {
  const { data: accounts = [] } = useQuery({ queryKey: ['financial-accounts'], queryFn: cashBanksApi.listAll })
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <label style={labelSm}>Medio de pago</label>
        <Select
          style={{ width: '100%' }}
          value={method}
          onChange={v => setMethod(v as ReceiptPaymentMethod)}
          options={(['CASH', 'TRANSFER', 'CARD'] as ReceiptPaymentMethod[]).map(m => ({ value: m, label: METHOD_LABELS[m] }))}
        />
      </div>
      <div>
        <label style={labelSm}>Referencia (opcional)</label>
        <input style={inputStyle} placeholder="nro. de comprobante" value={reference}
          onChange={e => setReference(e.target.value)} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelSm}>Cuenta que recibe *</label>
        <Select
          style={{ width: '100%' }}
          value={accountId}
          onChange={v => setAccountId(v)}
          options={[
            { value: '', label: 'Seleccionar cuenta…' },
            ...activeAccounts.map(a => ({ value: a.id, label: `${a.name} · ${formatCOP(a.currentBalance)}` })),
          ]}
        />
      </div>
    </div>
  )
}

// ─── Modo factura puntual: toggle "Pagar total" | "Abono parcial" ─────────────

function SinglePaymentForm({ receivable, customerName, onClose, onSaved }: {
  receivable: ReceivableDto
  customerName: string
  onClose: () => void
  onSaved?: () => void
}) {
  const [mode, setMode] = useState<'full' | 'partial'>('full')
  const [amountInput, setAmountInput] = useState('')
  const [method, setMethod] = useState<ReceiptPaymentMethod>('CASH')
  const [accountId, setAccountId] = useState('')
  const [reference, setReference] = useState('')

  const pending = receivable.pending
  const amount = mode === 'full' ? pending : parseFloat(amountInput) || 0
  const exceeds = mode === 'partial' && amount > pending
  const coversAll = mode === 'partial' && amount === pending
  const valid = amount > 0 && !exceeds && accountId !== ''

  const paysInFull = amount >= pending
  const mut = useReceiptMutation(onClose, onSaved, rc => paysInFull
    ? `Recibo ${rc.number} registrado · La factura ${receivable.invoiceNumber} se pagó correctamente`
    : `Recibo ${rc.number} registrado · Abono de ${formatCOP(rc.amount)} aplicado correctamente`)

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 460 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          Registrar pago · {receivable.invoiceNumber}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          {customerName} · vence {fmtDate(receivable.dueDate)} · saldo <b>{formatCOP(pending)}</b>
        </div>

        {/* Toggle segmentado */}
        <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          {([['full', 'Pagar total'], ['partial', 'Abono parcial']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px 0', fontSize: 13, fontWeight: mode === m ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit', border: 'none',
                background: mode === m ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                color: mode === m ? 'var(--accent-text)' : 'var(--muted)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelSm}>Monto {mode === 'full' ? '(saldo completo)' : 'del abono *'}</label>
          <input style={{ ...inputStyle, borderColor: exceeds ? 'var(--neg)' : 'var(--border)', opacity: mode === 'full' ? 0.7 : 1 }}
            type="number" min={0} disabled={mode === 'full'}
            value={mode === 'full' ? pending : amountInput}
            onChange={e => setAmountInput(e.target.value)} autoFocus={mode === 'partial'} />
          {exceeds && (
            <div style={{ fontSize: 11.5, color: 'var(--neg)', marginTop: 3 }}>
              El abono supera el saldo pendiente ({formatCOP(pending)})
            </div>
          )}
          {coversAll && (
            <div style={{ fontSize: 11.5, color: 'var(--accent-text)', marginTop: 3 }}>
              Este monto cubre todo el saldo — puedes usar "Pagar total"
            </div>
          )}
        </div>

        <CommonFields method={method} setMethod={setMethod} accountId={accountId}
          setAccountId={setAccountId} reference={reference} setReference={setReference} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn disabled={!valid || mut.isPending}
            onClick={() => mut.mutate({
              customerId: receivable.customerId, amount, paymentMethod: method,
              financialAccountId: accountId, reference: reference.trim() || undefined,
              applications: [{ accountsReceivableId: receivable.id, amount }],
            })}>
            {mut.isPending ? 'Registrando…' : mode === 'full' ? `Pagar ${formatCOP(pending)}` : 'Confirmar abono'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modo cliente: distribución FIFO multi-factura editable ──────────────────

function CustomerPaymentForm({ customerId, customerName, openArs, onClose, onSaved }: {
  customerId: string
  customerName: string
  openArs: ReceivableDto[]
  onClose: () => void
  onSaved?: () => void
}) {
  const [amountInput, setAmountInput] = useState('')
  const [method, setMethod] = useState<ReceiptPaymentMethod>('TRANSFER')
  const [accountId, setAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [rows, setRows] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)

  const amount = parseFloat(amountInput) || 0

  // Distribución FIFO: llena primero la factura con vencimiento más antiguo
  // (el backend entrega las CxC ordenadas por due_date ASC).
  const fifo = useMemo(() => {
    const dist: Record<string, string> = {}
    let left = amount
    for (const ar of openArs) {
      const applied = Math.min(left, ar.pending)
      if (applied > 0) dist[ar.id] = String(applied)
      left -= applied
      if (left <= 0) break
    }
    return dist
  }, [amount, openArs])

  useEffect(() => {
    if (!touched) setRows(fifo)
  }, [fifo, touched])

  const applied = openArs.reduce((acc, ar) => acc + (parseFloat(rows[ar.id]) || 0), 0)
  const overArs = openArs.filter(ar => (parseFloat(rows[ar.id]) || 0) > ar.pending)
  const sumOk = amount > 0 && Math.abs(applied - amount) < 0.01
  const valid = sumOk && overArs.length === 0 && accountId !== ''

  const mut = useReceiptMutation(onClose, onSaved)

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Registrar abono</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          Cliente: <b>{customerName}</b> · un solo Recibo de Caja puede cubrir varias facturas
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelSm}>Monto del abono *</label>
          <input style={inputStyle} type="number" min={0} autoFocus value={amountInput}
            onChange={e => { setAmountInput(e.target.value); setTouched(false) }} />
        </div>

        <CommonFields method={method} setMethod={setMethod} accountId={accountId}
          setAccountId={setAccountId} reference={reference} setReference={setReference} />

        <label style={{ ...labelSm, marginTop: 14 }}>
          DISTRIBUCIÓN {touched ? '(editada)' : '(propuesta FIFO por vencimiento)'}
        </label>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
          {openArs.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>El cliente no tiene facturas con saldo.</div>
          )}
          {openArs.map(ar => {
            const val = parseFloat(rows[ar.id]) || 0
            const over = val > ar.pending
            return (
              <div key={ar.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                <div style={{ flex: 1 }}>
                  <b>{ar.invoiceNumber}</b>
                  <span style={{ color: 'var(--muted)' }}> · vence {fmtDate(ar.dueDate)}</span>
                  {ar.daysOverdue > 0 && <span style={{ color: 'var(--neg)', fontWeight: 600 }}> · {ar.daysOverdue}d vencida</span>}
                </div>
                <span style={{ color: 'var(--muted)' }}>saldo {formatCOP(ar.pending)}</span>
                <input style={{ ...inputStyle, width: 110, padding: '5px 8px', borderColor: over ? 'var(--neg)' : 'var(--border)' }}
                  type="number" min={0} value={rows[ar.id] ?? ''}
                  onChange={e => { setRows(r => ({ ...r, [ar.id]: e.target.value })); setTouched(true) }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 16 }}>
          <span style={{ color: overArs.length ? 'var(--neg)' : 'var(--muted)' }}>
            {overArs.length > 0
              ? `${overArs.map(a => a.invoiceNumber).join(', ')}: el abono supera el saldo`
              : 'Cada renglón debe ser ≤ su saldo'}
          </span>
          <span style={{ fontWeight: 700, color: sumOk ? 'var(--pos)' : 'var(--neg)' }}>
            Aplicado {formatCOP(applied)} / {formatCOP(amount)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn disabled={!valid || mut.isPending}
            onClick={() => mut.mutate({
              customerId, amount, paymentMethod: method, financialAccountId: accountId,
              reference: reference.trim() || undefined,
              applications: openArs
                .filter(ar => (parseFloat(rows[ar.id]) || 0) > 0)
                .map(ar => ({ accountsReceivableId: ar.id, amount: parseFloat(rows[ar.id]) })),
            })}>
            {mut.isPending ? 'Registrando…' : 'Confirmar abono'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modal unificado ─────────────────────────────────────────────────────────

/**
 * Modal de pago reutilizable. Tres caminos, un solo recibo por el mismo endpoint:
 * - `receivable` → factura puntual con toggle "Pagar total" | "Abono parcial"
 * - `focusInvoiceId` → resuelve la CxC de esa factura (desde Facturación) y usa el modo puntual
 * - solo `customerId` → abono a nivel de cliente con distribución FIFO multi-factura
 */
export function RegisterPaymentModal({ customerId, customerName, receivable, focusInvoiceId, onClose, onSaved }: {
  customerId: string
  customerName: string
  receivable?: ReceivableDto
  focusInvoiceId?: string
  onClose: () => void
  onSaved?: () => void
}) {
  const { data: openArs = [], isLoading } = useQuery({
    queryKey: ['receivables', 'open', customerId],
    queryFn: () => receivablesApi.openByCustomer(customerId),
    enabled: !receivable,
  })

  if (receivable) {
    return <SinglePaymentForm receivable={receivable} customerName={customerName} onClose={onClose} onSaved={onSaved} />
  }
  if (isLoading) return null

  const focused = focusInvoiceId ? openArs.find(ar => ar.invoiceId === focusInvoiceId) : undefined
  if (focused) {
    return <SinglePaymentForm receivable={focused} customerName={customerName} onClose={onClose} onSaved={onSaved} />
  }
  return (
    <CustomerPaymentForm customerId={customerId} customerName={customerName}
      openArs={openArs} onClose={onClose} onSaved={onSaved} />
  )
}

/** Anulación auditable de un recibo: motivo obligatorio, nunca se borra. */
export function VoidReceiptModal({ receiptId, receiptNumber, onClose }: {
  receiptId: string
  receiptNumber: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const mut = useMutation({
    mutationFn: () => receivablesApi.voidReceipt(receiptId, reason.trim()),
    onSuccess: () => {
      invalidarVentas(queryClient)
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      toast(`Recibo ${receiptNumber} anulado`, 'success')
      onClose()
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast(e.response?.data?.message ?? 'No se pudo anular el recibo', 'error'),
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 440 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Anular recibo {receiptNumber}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          El recibo queda <b>ANULADO</b> con rastro de auditoría (nunca se borra). Se revierte el saldo
          de las facturas afectadas y se crea el movimiento financiero inverso.
        </div>
        <label style={labelSm}>Motivo de anulación *</label>
        <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} autoFocus value={reason}
          onChange={e => setReason(e.target.value)} placeholder="ej. consignación devuelta por el banco" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn style={{ background: 'var(--neg)' }} disabled={reason.trim().length < 3 || mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? 'Anulando…' : 'Anular recibo'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
