import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, Tile, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect, Select, PaginationFooter,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { supplierApi, type SupplierDto } from '../procurement/api/supplierApi'
import { purchaseOrderApi } from '../procurement/api/purchaseOrderApi'
import type { PurchaseOrderDto, ReceiptDto } from '../procurement/api/purchaseOrderApi'
import { accountsPayableApi } from '../procurement/api/accountsPayableApi'
import type { AccountsPayableDto, SupplierPaymentDto } from '../procurement/api/accountsPayableApi'
import { cashBanksApi } from '../finance/api/cashBanksApi'
import type { FinancialAccountDto } from '../finance/api/cashBanksApi'
import { toast } from '../../shared/toast'
import { formatCOP, formatQty } from '../../shared/currency'

function tileColorForName(name: string) {
  const colors = ['teal', 'blue', 'orange', 'purple', 'red', 'green']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(isoStr: string | null) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_COLOR: Record<string, 'ok' | 'warn' | 'cancelled' | 'info'> = {
  DRAFT: 'warn',
  CONFIRMED: 'info',
  PARTIALLY_RECEIVED: 'warn',
  RECEIVED: 'ok',
  CANCELLED: 'cancelled',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

const AP_STATUS_COLOR: Record<string, 'ok' | 'warn' | 'cancelled' | 'info'> = {
  PENDING: 'warn',
  PARTIALLY_PAID: 'info',
  PAID: 'ok',
  CANCELLED: 'cancelled',
}

const AP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
}

const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta débito',
  'Tarjeta crédito',
  'Cheque',
  'Otro',
]

const PAYMENT_ORIGINS = [
  'Caja principal',
  'Caja menor',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Otro',
]

// ── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  icon: string
  iconBg: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  title, description, confirmLabel, cancelLabel = 'Cancelar',
  variant = 'primary', icon, iconBg, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          width: '100%', maxWidth: 390,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}
      >
        {/* Body */}
        <div style={{ padding: '32px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          {/* Icon circle */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
            boxShadow: `0 4px 20px ${iconBg}`,
            marginBottom: 2,
          }}>
            {icon}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>{title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, maxWidth: 300 }}>{description}</div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '0 20px' }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px 20px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--text-2)', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 140ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: 'none',
              background: variant === 'danger'
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000))',
              color: '#fff', fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: variant === 'danger'
                ? '0 4px 14px rgba(239,68,68,0.35)'
                : '0 4px 14px rgba(var(--accent-rgb, 14,165,233), 0.35)',
              transition: 'opacity 140ms ease, transform 100ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PO Detail Modal ──────────────────────────────────────────────────────────

interface PODetailModalProps {
  orderId: string
  onClose: () => void
  onRefresh: () => void
}

function PODetailModal({ orderId, onClose, onRefresh }: PODetailModalProps) {
  const queryClient = useQueryClient()
  type ModalMode = 'detail' | 'receive' | 'pay'
  const [mode, setMode] = useState<ModalMode>('detail')
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({})
  const [receiveNotes, setReceiveNotes] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(today)
  const [payMethod, setPayMethod] = useState('')
  const [payOrigin, setPayOrigin]               = useState('')
  const [payAccountId, setPayAccountId]         = useState('')
  const [paySupplierAccount, setPaySupplierAccount] = useState('')
  const [payReference, setPayReference]         = useState('')
  const [payNotes, setPayNotes]                 = useState('')
  const [dialog, setDialog] = useState<{
    title: string; description: string; confirmLabel: string
    variant: 'danger' | 'primary'; icon: string; iconBg: string
    onConfirm: () => void
  } | null>(null)

  const { data: order, isLoading } = useQuery<PurchaseOrderDto>({
    queryKey: ['purchase-order', orderId],
    queryFn: () => purchaseOrderApi.getById(orderId),
  })

  const hasReceipt = order?.status === 'RECEIVED' || order?.status === 'PARTIALLY_RECEIVED'

  const { data: receipt } = useQuery<ReceiptDto>({
    queryKey: ['purchase-order-receipt', orderId],
    queryFn: () => purchaseOrderApi.getReceipt(orderId),
    enabled: hasReceipt,
  })

  const { data: ap } = useQuery<AccountsPayableDto>({
    queryKey: ['ap-by-po', orderId],
    queryFn: () => accountsPayableApi.getByPurchaseOrder(orderId),
    enabled: hasReceipt,
    retry: false,
  })

  const { data: payments = [] } = useQuery<SupplierPaymentDto[]>({
    queryKey: ['ap-payments', ap?.id],
    queryFn: () => accountsPayableApi.getPayments(ap!.id),
    enabled: !!ap?.id,
  })

  const { data: financialAccounts = [] } = useQuery<FinancialAccountDto[]>({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
    enabled: mode === 'pay',
  })

  const confirmMutation = useMutation({
    mutationFn: () => purchaseOrderApi.confirm(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      onRefresh()
      toast('Orden confirmada', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al confirmar'
      toast(msg, 'error')
    },
  })

  const receiveMutation = useMutation({
    mutationFn: (lines: { lineId: string; quantityReceived: number }[]) =>
      purchaseOrderApi.receive(orderId, { lines, notes: receiveNotes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order-receipt', orderId] })
      queryClient.invalidateQueries({ queryKey: ['ap-by-po', orderId] })
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
      onRefresh()
      setMode('detail')
      toast('Recepción registrada — inventario actualizado y factura generada', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al recibir'
      toast(msg, 'error')
    },
  })

  const payMutation = useMutation({
    mutationFn: () => accountsPayableApi.pay(ap!.id, {
      amount: parseFloat(payAmount),
      paymentDate: payDate || null,
      paymentMethod: payMethod || null,
      paymentOrigin: (financialAccounts.find(a => a.id === payAccountId)?.name ?? payOrigin) || null,
      supplierAccount: paySupplierAccount.trim() || null,
      referenceNumber: payReference.trim() || null,
      notes: payNotes.trim() || null,
      financialAccountId: payAccountId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-by-po', orderId] })
      queryClient.invalidateQueries({ queryKey: ['ap-payments', ap?.id] })
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      setMode('detail')
      setPayAmount(''); setPayDate(today); setPayMethod(''); setPayOrigin('')
      setPayAccountId(''); setPaySupplierAccount(''); setPayReference(''); setPayNotes('')
      toast('Pago registrado correctamente', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar pago'
      toast(msg, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => purchaseOrderApi.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      onRefresh()
      onClose()
      toast('Orden eliminada', 'info')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo eliminar'
      toast(msg, 'error')
    },
  })

  function initReceiveMode() {
    if (!order) return
    const defaults: Record<string, string> = {}
    order.lines.forEach(l => { defaults[l.id] = String(l.quantity) })
    setReceivedQtys(defaults)
    setReceiveNotes('')
    setMode('receive')
  }

  function handleConfirmReceive() {
    if (!order) return
    const lines = order.lines.map(l => ({
      lineId: l.id,
      quantityReceived: parseFloat(receivedQtys[l.id] ?? '0') || 0,
    }))
    receiveMutation.mutate(lines)
  }

  const busy = confirmMutation.isPending || receiveMutation.isPending || deleteMutation.isPending || payMutation.isPending

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px 12px',
  }

  const modal: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, width: '100%', maxWidth: 860,
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
    animation: 'fadeUp 0.18s ease',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
    textAlign: 'right', boxSizing: 'border-box',
  }

  if (isLoading || !order) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={{ ...modal, alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando orden…</span>
        </div>
      </div>
    )
  }

  const canDelete = order.status !== 'RECEIVED' && order.status !== 'PARTIALLY_RECEIVED' && order.status !== 'CANCELLED'
  const canConfirm = order.status === 'DRAFT'
  const canReceive = order.status === 'CONFIRMED'

  // ── RECEIVE MODE ────────────────────────────────────────────────────────────
  if (mode === 'receive') {
    return (
      <div style={overlay} onClick={() => setMode('detail')}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Registrar recepción — <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{order.orderNumber}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Edita las cantidades realmente recibidas. La factura se generará con estos valores.
              </div>
            </div>
            <button onClick={() => setMode('detail')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>
              ×
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...tableStyle, fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Producto</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cant. solicitada</th>
                    <th style={{ ...thStyle, textAlign: 'right', color: 'var(--accent)' }}>Cant. recibida</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pendiente</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Costo unit.</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map(line => {
                    const received = parseFloat(receivedQtys[line.id] ?? String(line.quantity)) || 0
                    const pending = line.quantity - received
                    const lineTotal = received * line.unitCost * (1 + line.taxRate / 100) * (1 - line.discount / 100)
                    return (
                      <tr key={line.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{line.productName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{line.unitOfMeasure}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--muted)' }}>
                          {line.quantity}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', padding: '6px 8px' }}>
                          <input
                            type="number"
                            min={0}
                            max={line.quantity}
                            step="0.001"
                            value={receivedQtys[line.id] ?? String(line.quantity)}
                            onChange={e => setReceivedQtys(prev => ({ ...prev, [line.id]: e.target.value }))}
                            style={inputStyle}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: pending > 0 ? 'var(--neg)' : 'var(--pos)', fontWeight: 600 }}>
                          {pending > 0 ? formatQty(pending, 3, true) : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCOP(line.unitCost)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCOP(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total a facturar */}
            <div style={{
              alignSelf: 'flex-end', minWidth: 220,
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                Total a facturar
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                {formatCOP(order.lines.reduce((sum, line) => {
                  const received = parseFloat(receivedQtys[line.id] ?? String(line.quantity)) || 0
                  return sum + received * line.unitCost * (1 + line.taxRate / 100) * (1 - line.discount / 100)
                }, 0))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Observaciones (opcional)
              </div>
              <textarea
                value={receiveNotes}
                onChange={e => setReceiveNotes(e.target.value)}
                placeholder="Ej: Llegó con embalaje dañado, faltaron 20 kg de trucha..."
                rows={3}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <GhostBtn style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => setMode('detail')} disabled={busy}>
              Cancelar
            </GhostBtn>
            <PrimaryBtn onClick={handleConfirmReceive} disabled={busy}>
              {receiveMutation.isPending ? 'Procesando…' : 'Confirmar recepción'}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    )
  }

  // ── PAY MODE ────────────────────────────────────────────────────────────────
  if (mode === 'pay' && ap) {
    const parsedAmount = parseFloat(payAmount)
    const amountValid = payAmount !== '' && parsedAmount > 0 && parsedAmount <= ap.pendingAmount
    const canSubmit = amountValid && !busy

    const fieldLabel = (text: string) => (
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {text}
      </div>
    )

    const fieldInput = (node: React.ReactNode) => (
      <div style={{ marginBottom: 14 }}>{node}</div>
    )

    const sel: React.CSSProperties = { ...inputStyle, textAlign: 'left', cursor: 'pointer', appearance: 'none' as const }

    return (
      <div style={overlay} onClick={() => setMode('detail')}>
        <div style={{ ...modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '18px 22px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                Registrar pago
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {ap.invoiceNumber && (
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                    {ap.invoiceNumber}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ap.supplierName}</span>
              </div>
            </div>
            <button onClick={() => setMode('detail')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1, marginTop: 2 }}>
              ×
            </button>
          </div>

          {/* Info cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            padding: '14px 22px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}>
            {[
              { label: 'Total factura', value: formatCOP(ap.totalAmount), color: 'var(--text)' },
              { label: 'Total pagado', value: formatCOP(ap.paidAmount), color: 'var(--pos)' },
              { label: 'Saldo pendiente', value: formatCOP(ap.pendingAmount), color: 'var(--neg)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: '18px 22px 6px', overflowY: 'auto' }}>

            {/* Row 1: amount + date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 0 }}>
              <div>
                {fieldLabel('Monto a pagar *')}
                {fieldInput(
                  <input type="number" min={0.01} step={0.01} max={ap.pendingAmount}
                    value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    placeholder={`Máx. ${formatCOP(ap.pendingAmount)}`}
                    style={{
                      ...inputStyle, textAlign: 'left',
                      ...(payAmount && !amountValid ? { borderColor: 'var(--neg)' } : {}),
                    }} />
                )}
                {payAmount && !amountValid && (
                  <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: -10, marginBottom: 10 }}>
                    {parsedAmount > ap.pendingAmount
                      ? `Máximo ${formatCOP(ap.pendingAmount)}`
                      : 'Ingresa un monto válido'}
                  </div>
                )}
              </div>
              <div>
                {fieldLabel('Fecha del pago *')}
                {fieldInput(
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                    style={{ ...inputStyle, textAlign: 'left' }} />
                )}
              </div>
            </div>

            {/* Row 2: method + origin */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                {fieldLabel('Método de pago')}
                {fieldInput(
                  <Select
                    style={{ width: '100%' }}
                    value={payMethod}
                    onChange={v => setPayMethod(v)}
                    options={[
                      { value: '', label: '— Seleccionar —' },
                      ...PAYMENT_METHODS.map(m => ({ value: m, label: m })),
                    ]}
                  />
                )}
              </div>
              <div>
                {fieldLabel('Caja / Banco origen')}
                {fieldInput(
                  <Select
                    style={{ width: '100%' }}
                    value={payAccountId}
                    onChange={v => setPayAccountId(v)}
                    options={[
                      { value: '', label: '— Seleccionar cuenta —' },
                      ...financialAccounts.map(a => ({ value: a.id, label: `${a.name} (${formatCOP(a.currentBalance)})` })),
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Row 3: supplier account */}
            <div>
              {fieldLabel('Cuenta destino del proveedor (opcional)')}
              {fieldInput(
                <input type="text" value={paySupplierAccount}
                  onChange={e => setPaySupplierAccount(e.target.value)}
                  placeholder="Ej: Bancolombia · Cta. Ahorro · 123-456789-00"
                  style={{ ...inputStyle, textAlign: 'left' }} />
              )}
            </div>

            {/* Row 4: reference */}
            <div>
              {fieldLabel('Comprobante / referencia (opcional)')}
              {fieldInput(
                <input type="text" value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="Ej: TRF-20260628-001"
                  style={{ ...inputStyle, textAlign: 'left' }} />
              )}
            </div>

            {/* Row 5: notes */}
            <div>
              {fieldLabel('Observación (opcional)')}
              <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                placeholder="Notas adicionales sobre este pago…"
                style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', marginBottom: 14 }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <GhostBtn style={{ fontSize: 12.5 }} onClick={() => setMode('detail')} disabled={busy}>
              Cancelar
            </GhostBtn>
            <PrimaryBtn onClick={() => payMutation.mutate()} disabled={!canSubmit}>
              {payMutation.isPending ? 'Registrando…' : 'Registrar pago'}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    )
  }

  // ── DETAIL MODE ─────────────────────────────────────────────────────────────
  return (
    <>
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
              {order.orderNumber}
            </span>
            <StatusChip status={STATUS_COLOR[order.status]} label={STATUS_LABEL[order.status] ?? order.status} />
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              ['Proveedor', order.supplierName],
              ['Entrega esperada', formatDate(order.expectedDelivery)],
              ['Almacén', order.warehouseName ?? order.warehouse ?? '—'],
              ['Condiciones de pago', order.paymentTerms ?? '—'],
              ['Creada', formatDate(order.createdAt)],
              ['Notas', order.notes ?? '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Lines or Receipt */}
          {receipt ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recepción registrada
                {order.status === 'PARTIALLY_RECEIVED' && (
                  <span style={{ marginLeft: 8, color: 'var(--warn, #f59e0b)', fontSize: 11 }}>· Recepción parcial</span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...tableStyle, fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Producto</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Solicitado</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Recibido</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Pendiente</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.lines.map(rl => (
                      <tr key={rl.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{rl.productName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rl.unitOfMeasure}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--muted)' }}>{rl.quantityOrdered}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--pos)' }}>{rl.quantityReceived}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: rl.quantityPending > 0 ? 'var(--neg)' : 'var(--muted)' }}>
                          {rl.quantityPending > 0 ? rl.quantityPending : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCOP(rl.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Total facturado: <strong style={{ color: 'var(--accent)', fontSize: 15 }}>{formatCOP(receipt.totalReceived)}</strong>
                </div>
              </div>
              {receipt.notes && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>
                  Obs: {receipt.notes}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Productos solicitados
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...tableStyle, fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Producto</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cant.</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Costo unit.</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Desc. %</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>IVA %</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map(line => (
                      <tr key={line.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{line.productName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{line.unitOfMeasure}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{line.quantity}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCOP(line.unitCost)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: line.discount > 0 ? 'var(--pos)' : 'var(--muted)' }}>
                          {line.discount > 0 ? `${line.discount}%` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{line.taxRate > 0 ? `${line.taxRate}%` : '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCOP(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 24 }}>
                {[['Subtotal', order.subtotal], ['IVA', order.totalTax], ['Total', order.total]].map(([l, v]) => (
                  <div key={l as string} style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {l as string}: <strong style={{ color: 'var(--text)' }}>{formatCOP(v as number)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Factura / AP section */}
          {ap && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Factura de proveedor
                  </div>
                  {ap.invoiceNumber && (
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                      {ap.invoiceNumber}
                    </span>
                  )}
                  <StatusChip status={AP_STATUS_COLOR[ap.status]} label={AP_STATUS_LABEL[ap.status] ?? ap.status} />
                </div>
                {ap.status !== 'PAID' && ap.status !== 'CANCELLED' && (
                  <PrimaryBtn style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setMode('pay')}>
                    + Registrar pago
                  </PrimaryBtn>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  ['Total factura', formatCOP(ap.totalAmount)],
                  ['Total pagado', formatCOP(ap.paidAmount)],
                  ['Saldo pendiente', formatCOP(ap.pendingAmount)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: label === 'Saldo pendiente' && ap.pendingAmount > 0 ? 'var(--neg)' : 'var(--text)',
                    }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment history */}
              {payments.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                    Historial de pagos
                  </div>
                  <table style={{ ...tableStyle, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Fecha</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                        <th style={thStyle}>Método</th>
                        <th style={thStyle}>Banco / cuenta</th>
                        <th style={thStyle}>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ ...tdStyle, color: 'var(--muted)' }}>{formatDate(p.paymentDate)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--pos)' }}>{formatCOP(p.amount)}</td>
                          <td style={tdStyle}>{p.paymentMethod ?? '—'}</td>
                          <td style={{ ...tdStyle, color: 'var(--muted)' }}>{p.bankAccount ?? '—'}</td>
                          <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11 }}>{p.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          {canDelete && (
            <GhostBtn
              style={{ fontSize: 12.5, padding: '6px 12px', color: 'var(--neg)' }}
              onClick={() => setDialog({
                title: `Eliminar ${order.orderNumber}`,
                description: 'Esta acción es permanente. La orden será eliminada del sistema.',
                confirmLabel: 'Sí, eliminar',
                variant: 'danger',
                icon: '🗑️',
                iconBg: 'rgba(239,68,68,0.12)',
                onConfirm: () => { setDialog(null); deleteMutation.mutate() },
              })}
              disabled={busy}
            >
              Eliminar
            </GhostBtn>
          )}
          {canConfirm && (
            <GhostBtn style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => confirmMutation.mutate()} disabled={busy}>
              {confirmMutation.isPending ? 'Confirmando…' : 'Confirmar'}
            </GhostBtn>
          )}
          {canReceive && (
            <PrimaryBtn onClick={initReceiveMode} disabled={busy}>
              Recibir orden
            </PrimaryBtn>
          )}
        </div>
      </div>
    </div>

    {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}
  </>
  )
}

// ── Supplier Edit Modal ──────────────────────────────────────────────────────

function SupplierEditModal({ supplier, onClose }: { supplier: SupplierDto; onClose: () => void }) {
  const qc = useQueryClient()
  const { lang } = useAppStore()
  const t = translations[lang]

  const [name, setName] = useState(supplier.name)
  const [contactName, setContactName] = useState(supplier.contactName ?? '')
  const [email, setEmail] = useState(supplier.email ?? '')
  const [phone, setPhone] = useState(supplier.phone ?? '')
  const [address, setAddress] = useState(supplier.address ?? '')
  const [taxId, setTaxId] = useState(supplier.taxId ?? '')
  const [notes, setNotes] = useState(supplier.notes ?? '')
  const [taxIdError, setTaxIdError] = useState('')

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!taxId.trim()) {
        setTaxIdError('El NIF es obligatorio')
        return Promise.reject(new Error('El NIF es obligatorio'))
      }
      setTaxIdError('')
      return supplierApi.update(supplier.id, {
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        taxId: taxId.trim(),
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast('Proveedor actualizado', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo actualizar'
      toast(msg, 'error')
    },
  })

  const iStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 500,
    color: 'var(--text-2)', marginBottom: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, width: 480, maxHeight: '88vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.18s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Editar proveedor</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{t.th_supplier} *</label>
            <input style={iStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t.f_tax_id} *</label>
            <input style={{ ...iStyle, borderColor: taxIdError ? 'var(--error, #e53e3e)' : undefined }}
              type="text" placeholder="900-123456-7" value={taxId}
              onChange={(e) => { setTaxId(e.target.value); if (e.target.value.trim()) setTaxIdError('') }} />
            {taxIdError && <span style={{ fontSize: 11.5, color: 'var(--error, #e53e3e)', marginTop: 3, display: 'block' }}>{taxIdError}</span>}
          </div>
          <div>
            <label style={labelStyle}>{t.f_contact_name}</label>
            <input style={iStyle} type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t.f_email}</label>
              <input style={iStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t.f_phone}</label>
              <input style={iStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t.f_address}</label>
            <textarea style={{ ...iStyle, minHeight: 60, resize: 'vertical' }} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t.f_notes}</label>
            <textarea style={{ ...iStyle, minHeight: 60, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.btn_cancel}
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !name.trim()}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: updateMutation.isPending || !name.trim() ? 0.6 : 1 }}
          >
            {updateMutation.isPending ? 'Guardando…' : t.btn_save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function Purchases() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [orderPage, setOrderPage] = useState(0)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierPage, setSupplierPage] = useState(0)
  const PAGE_SIZE = 12

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierApi.listAll,
  })

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrderApi.listAll,
  })

  const q = orderSearch.trim().toLowerCase()
  const filteredOrders = orders.filter(o =>
    (orderStatus === 'all' || o.status === orderStatus) &&
    (!q || o.orderNumber.toLowerCase().includes(q) || o.supplierName.toLowerCase().includes(q)))
  const pagedOrders = filteredOrders.slice(orderPage * PAGE_SIZE, (orderPage + 1) * PAGE_SIZE)

  const sq = supplierSearch.trim().toLowerCase()
  const filteredSuppliers = suppliers.filter(sp =>
    !sq || sp.name.toLowerCase().includes(sq)
    || (sp.taxId ?? '').toLowerCase().includes(sq)
    || (sp.contactName ?? '').toLowerCase().includes(sq))
  const pagedSuppliers = filteredSuppliers.slice(supplierPage * PAGE_SIZE, (supplierPage + 1) * PAGE_SIZE)

  const totalValue = orders.reduce((s, o) => s + o.total, 0)
  const pendingOrders = orders.filter((o) => o.status === 'DRAFT' || o.status === 'CONFIRMED').length
  const receivedOrders = orders.filter((o) => o.status === 'RECEIVED').length

  async function handleDeleteSupplier(id: string, name: string) {
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return
    try {
      await supplierApi.delete(id)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast('Proveedor eliminado', 'info')
    } catch {
      toast('No se pudo eliminar el proveedor', 'error')
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 7,
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 140ms ease, color 140ms ease',
  })

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.pu_suppliers} value={String(suppliers.length)} sub="proveedores activos" />
        <KpiCard label="Órdenes totales" value={String(orders.length)} sub="all time" />
        <KpiCard label="Pendientes" value={String(pendingOrders)} sub="borrador + confirmada" />
        <KpiCard label="Valor total" value={formatCOP(totalValue)} sub="todas las órdenes" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{
          display: 'flex', gap: 3,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 3,
        }}>
          <button style={tabStyle(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>
            Órdenes de compra
          </button>
          <button style={tabStyle(activeTab === 'suppliers')} onClick={() => setActiveTab('suppliers')}>
            {t.tab_suppliers}
          </button>
        </div>

        <PrimaryBtn onClick={() => openDrawer(activeTab === 'suppliers' ? 'supplier' : 'po')}>
          + {activeTab === 'suppliers' ? t.btn_new_supplier : t.btn_new_po}
        </PrimaryBtn>
      </div>

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader title="Órdenes de compra" action={
            <GhostBtn style={{ fontSize: 11.5, padding: '5px 10px' }}>{t.btn_export}</GhostBtn>
          } />
          <div style={{ padding: '12px 18px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={orderSearch}
              onChange={e => { setOrderSearch(e.target.value); setOrderPage(0) }}
              placeholder="Buscar por OC o proveedor…"
              style={{
                width: 240, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
              }}
            />
            <FilterSelect value={orderStatus} onChange={v => { setOrderStatus(v); setOrderPage(0) }} options={[
              { value: 'all', label: 'Todos los estados' },
              ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ]} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loadingOrders ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                {orders.length === 0
                  ? 'No hay órdenes de compra aún. Crea una con el botón de arriba.'
                  : 'Sin órdenes que coincidan con los filtros.'}
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>OC Nº</th>
                    <th style={thStyle}>Proveedor</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Estado</th>
                    <th style={thStyle}>Entrega</th>
                    <th style={thStyle}>Almacén</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
                    <th style={thStyle}>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                        {o.orderNumber}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Tile initial={o.supplierName.slice(0, 2).toUpperCase()} tile={tileColorForName(o.supplierName)} size={26} />
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{o.supplierName}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <StatusChip status={STATUS_COLOR[o.status]} label={STATUS_LABEL[o.status] ?? o.status} />
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12.5, color: 'var(--muted)' }}>
                        {formatDate(o.expectedDelivery)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12.5 }}>{o.warehouseName ?? o.warehouse ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {formatCOP(o.total)}
                      </td>
                      <td style={{
                        ...tdStyle, textAlign: 'right',
                        color: o.pendingBalance > 0 ? 'var(--neg)' : 'var(--pos)',
                        fontWeight: 600,
                      }}>
                        {formatCOP(o.pendingBalance)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--muted)' }}>
                        {formatDate(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <PaginationFooter total={filteredOrders.length} page={orderPage} pageSize={PAGE_SIZE}
            onPage={setOrderPage} unit="órdenes" />
        </Card>
      )}

      {/* Suppliers tab */}
      {activeTab === 'suppliers' && (
        <Card>
          <CardHeader title={t.tab_suppliers} />
          <div style={{ padding: '12px 18px 0' }}>
            <input
              value={supplierSearch}
              onChange={e => { setSupplierSearch(e.target.value); setSupplierPage(0) }}
              placeholder="Buscar por nombre, NIT o contacto…"
              style={{
                width: 260, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loadingSuppliers ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
            ) : filteredSuppliers.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {suppliers.length === 0 ? t.no_suppliers : 'Sin proveedores que coincidan con la búsqueda.'}
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t.th_supplier}</th>
                    <th style={thStyle}>{t.f_contact_name}</th>
                    <th style={thStyle}>{t.f_email}</th>
                    <th style={thStyle}>{t.f_phone}</th>
                    <th style={thStyle}>{t.f_tax_id}</th>
                    <th style={thStyle}>{t.th_status}</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {pagedSuppliers.map((s) => (
                    <tr key={s.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Tile initial={s.name.slice(0, 2).toUpperCase()} tile={tileColorForName(s.name)} size={28} />
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{s.contactName ?? '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--accent-text)', fontSize: 12.5 }}>{s.email ?? '—'}</td>
                      <td style={tdStyle}>{s.phone ?? '—'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{s.taxId ?? '—'}</td>
                      <td style={tdStyle}>
                        <StatusChip status={s.active ? 'ok' : 'cancelled'} label={s.active ? t.opt_active : t.opt_inactive} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <GhostBtn
                            style={{ fontSize: 12, padding: '4px 9px' }}
                            onClick={() => setEditingSupplier(s)}
                          >
                            Editar
                          </GhostBtn>
                          <GhostBtn
                            style={{ fontSize: 12, padding: '4px 9px', color: 'var(--neg)' }}
                            onClick={() => handleDeleteSupplier(s.id, s.name)}
                          >
                            Eliminar
                          </GhostBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <PaginationFooter total={filteredSuppliers.length} page={supplierPage} pageSize={PAGE_SIZE}
            onPage={setSupplierPage} unit="proveedores" />
        </Card>
      )}

      {/* PO Detail Modal */}
      {selectedOrderId && (
        <PODetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
        />
      )}

      {/* Supplier Edit Modal */}
      {editingSupplier && (
        <SupplierEditModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
        />
      )}
    </div>
  )
}
