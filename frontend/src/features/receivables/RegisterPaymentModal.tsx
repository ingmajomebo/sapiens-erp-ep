import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PrimaryBtn, GhostBtn } from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import { cashBanksApi } from '../finance/api/cashBanksApi'
import { receivablesApi, type ReceiptPaymentMethod } from './api/receivablesApi'

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
 * Modal de abono reutilizable (CxC y Facturación): crea un Recibo de Caja aplicado
 * a una o varias facturas del cliente. Propone distribución FIFO por vencimiento
 * más antiguo, editable, con validación en vivo (suma == monto, renglón ≤ saldo).
 */
export function RegisterPaymentModal({ customerId, customerName, focusInvoiceId, onClose, onSaved }: {
  customerId: string
  customerName: string
  focusInvoiceId?: string
  onClose: () => void
  onSaved?: () => void
}) {
  const queryClient = useQueryClient()
  const [amountInput, setAmountInput] = useState('')
  const [method, setMethod] = useState<ReceiptPaymentMethod>('TRANSFER')
  const [accountId, setAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [rows, setRows] = useState<Record<string, string>>({})   // arId → monto digitado
  const [touched, setTouched] = useState(false)                  // el usuario editó la distribución

  const { data: openArs = [] } = useQuery({
    queryKey: ['receivables', 'open', customerId],
    queryFn: () => receivablesApi.openByCustomer(customerId),
  })
  const { data: accounts = [] } = useQuery({ queryKey: ['financial-accounts'], queryFn: cashBanksApi.listAll })
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')

  const amount = parseFloat(amountInput) || 0

  // Distribución FIFO propuesta: llena primero la factura con vencimiento más antiguo.
  // El backend ya entrega las CxC ordenadas por due_date ASC.
  const fifo = useMemo(() => {
    const dist: Record<string, string> = {}
    let left = amount
    const sorted = focusInvoiceId
      ? [...openArs].sort((a, b) => (a.invoiceId === focusInvoiceId ? -1 : b.invoiceId === focusInvoiceId ? 1 : 0))
      : openArs
    for (const ar of sorted) {
      const applied = Math.min(left, ar.pending)
      if (applied > 0) dist[ar.id] = String(applied)
      left -= applied
      if (left <= 0) break
    }
    return dist
  }, [amount, openArs, focusInvoiceId])

  useEffect(() => {
    if (!touched) setRows(fifo)
  }, [fifo, touched])

  const applied = openArs.reduce((acc, ar) => acc + (parseFloat(rows[ar.id]) || 0), 0)
  const overArs = openArs.filter(ar => (parseFloat(rows[ar.id]) || 0) > ar.pending)
  const sumOk = amount > 0 && Math.abs(applied - amount) < 0.01
  const valid = sumOk && overArs.length === 0 && accountId !== ''

  const mut = useMutation({
    mutationFn: () => receivablesApi.createReceipt({
      customerId, amount, paymentMethod: method, financialAccountId: accountId,
      reference: reference.trim() || undefined,
      applications: openArs
        .filter(ar => (parseFloat(rows[ar.id]) || 0) > 0)
        .map(ar => ({ accountsReceivableId: ar.id, amount: parseFloat(rows[ar.id]) })),
    }),
    onSuccess: (rc) => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoice-detail'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast(`Recibo ${rc.number} registrado por ${formatCOP(rc.amount)}`, 'success')
      onSaved?.()
      onClose()
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast(e.response?.data?.message ?? 'No se pudo registrar el abono', 'error'),
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Registrar abono</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          Cliente: <b>{customerName}</b> · genera un Recibo de Caja con consecutivo propio
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelSm}>Monto del abono *</label>
            <input style={inputStyle} type="number" min={0} autoFocus value={amountInput}
              onChange={e => { setAmountInput(e.target.value); setTouched(false) }} />
          </div>
          <div>
            <label style={labelSm}>Medio de pago</label>
            <select style={inputStyle} value={method} onChange={e => setMethod(e.target.value as ReceiptPaymentMethod)}>
              {(['CASH', 'TRANSFER', 'CARD'] as ReceiptPaymentMethod[]).map(m => (
                <option key={m} value={m}>{METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSm}>Cuenta que recibe *</label>
            <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Seleccionar cuenta…</option>
              {activeAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} · {formatCOP(a.currentBalance)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSm}>Referencia (opcional)</label>
            <input style={inputStyle} placeholder="nro. de comprobante" value={reference}
              onChange={e => setReference(e.target.value)} />
          </div>
        </div>

        {/* Distribución */}
        <label style={labelSm}>
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
          <PrimaryBtn disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Registrando…' : 'Confirmar abono'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
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
      queryClient.invalidateQueries({ queryKey: ['receivables'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoice-detail'] })
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
