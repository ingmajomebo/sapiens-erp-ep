import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidarVentas } from '../../api/invalidarVentas'
import { cashBanksApi } from '../finance/api/cashBanksApi'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, Select,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import { useAppStore } from '../../store/useAppStore'
import { RegisterPaymentModal } from '../receivables/RegisterPaymentModal'
import {
  salesInvoiceApi,
  type SalesInvoiceDto, type SalesInvoiceStatus,
  type InvoicePaymentMethod,
} from '../sales/api/salesApi'
import {
  einvoicingApi, ELECTRONIC_LABELS, ELECTRONIC_CHIP,
  type ElectronicStatusDto,
} from './api/einvoicingApi'

const fmtDate = (v: string | null | undefined, withTime = false) =>
  v ? new Date(v.length === 10 ? v + 'T00:00:00' : v).toLocaleDateString('es-CO',
      withTime ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'Borrador', ISSUED: 'Emitida', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
}
const STATUS_TO_CHIP: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'draft', ISSUED: 'issued', PARTIALLY_PAID: 'partial', PAID: 'paid', CANCELLED: 'critical',
}
const METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modalBox: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%', maxWidth: 440,
}
const labelSm: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4,
}

// ─── Modal: cancelar (novedad obligatoria; emitida/pagada genera nota crédito) ─

function CancelInvoiceModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMut = useMutation({
    mutationFn: () => salesInvoiceApi.cancel(invoice.id, reason),
    onSuccess: inv => {
      invalidarVentas(qc)
      toast(invoice.status === 'DRAFT'
        ? `Borrador cancelado (pedido ${invoice.orderNumber})`
        : `Factura ${inv.invoiceNumber} cancelada · nota crédito generada`, 'info')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al cancelar la factura', 'error')
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          {invoice.invoiceNumber ? `Cancelar factura ${invoice.invoiceNumber}` : `Cancelar borrador · pedido ${invoice.orderNumber}`}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          {invoice.customerName} · {formatCOP(invoice.total)}
          {invoice.status !== 'DRAFT' && ' · se generará una nota crédito'}
        </div>
        <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
          placeholder="Novedad de cancelación (obligatoria)"
          value={reason} onChange={e => setReason(e.target.value)} autoFocus />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn style={{ background: 'var(--neg)' }} disabled={!reason.trim() || cancelMut.isPending}
            onClick={() => cancelMut.mutate()}>
            Confirmar cancelación
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: cobrar borrador (emite internamente, luego registra el pago) ────────

type DraftPayMode = 'full' | 'partial' | 'credit'

function DraftPaymentModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<DraftPayMode>('full')
  const [partialAmt, setPartialAmt] = useState(String(invoice.total))
  const [method, setMethod] = useState<InvoicePaymentMethod>('CASH')
  const [creditDays, setCreditDays] = useState('30')
  const [accountId, setAccountId] = useState('')

  /*
   * La cuenta que recibe el dinero. Sin ella el backend crea el recibo pero NO
   * mueve ningún saldo (`financialAccountId` es opcional allí), así que las
   * cajas quedaban en cero por más facturas que se cobraran.
   */
  const { data: accounts = [] } = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
  })
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')

  const invalidate = () => invalidarVentas(qc)

  const mut = useMutation({
    mutationFn: async () => {
      if (mode === 'credit') {
        return await salesInvoiceApi.emit(invoice.id, {
          paymentForm: 'CREDIT',
          creditTermDays: parseInt(creditDays),
          paymentMethod: method,
        })
      }
      await salesInvoiceApi.emit(invoice.id, { paymentForm: 'CASH', creditTermDays: 0, paymentMethod: method })
      const amount = mode === 'full' ? invoice.total : parseFloat(partialAmt)
      return await salesInvoiceApi.registerPayment(invoice.id, {
        amount, paymentMethod: method, financialAccountId: accountId,
      })
    },
    onSuccess: inv => {
      invalidate()
      if (mode === 'credit') {
        toast(`Factura ${inv.invoiceNumber} emitida a crédito · ${creditDays} días`, 'success')
      } else if (mode === 'full') {
        toast(`Factura ${inv.invoiceNumber} cobrada`, 'success')
      } else {
        toast(`Factura ${inv.invoiceNumber} · saldo ${formatCOP(inv.balance)} registrado en CxC`, 'success')
      }
      onClose()
    },
    onError: (e: unknown) => {
      invalidate()
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al procesar', 'error')
    },
  })

  const partialVal = parseFloat(partialAmt) || 0
  const partialValid = partialVal > 0 && partialVal < invoice.total
  // A crédito no entra dinero, así que ahí no se pide cuenta.
  const cuentaLista = mode === 'credit' || accountId !== ''
  const canSubmit = !mut.isPending && cuentaLista && (mode !== 'partial' || partialValid)

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 10px', border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8, background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg)',
    color: active ? 'var(--accent-text)' : 'var(--muted)', fontWeight: active ? 700 : 500,
    fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Cobrar factura · {invoice.orderNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {invoice.customerName} · Total: <b style={{ color: 'var(--text)' }}>{formatCOP(invoice.total)}</b>
        </div>

        {/* Selector de modo */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button type="button" style={tabStyle(mode === 'full')} onClick={() => setMode('full')}>Pago completo</button>
          <button type="button" style={tabStyle(mode === 'partial')} onClick={() => setMode('partial')}>Abono parcial</button>
          <button type="button" style={tabStyle(mode === 'credit')} onClick={() => setMode('credit')}>A crédito</button>
        </div>

        {/* Modo: abono parcial */}
        {mode === 'partial' && (
          <>
            <label style={labelSm}>MONTO A COBRAR AHORA</label>
            <input style={{ ...inputStyle, marginBottom: 6 }} type="number" min="0.01" max={invoice.total - 0.01}
              value={partialAmt} onChange={e => setPartialAmt(e.target.value)} autoFocus />
            {!partialValid && partialAmt !== '' && (
              <div style={{ fontSize: 12, color: 'var(--neg)', marginBottom: 8 }}>
                Ingresa un monto entre $0 y {formatCOP(invoice.total)} (sin incluir el total)
              </div>
            )}
            {partialValid && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Saldo <b style={{ color: 'var(--neg)' }}>{formatCOP(invoice.total - partialVal)}</b> irá a Cuentas por Cobrar
              </div>
            )}
          </>
        )}

        {/* Modo: crédito */}
        {mode === 'credit' && (
          <>
            <label style={labelSm}>PLAZO DE CRÉDITO</label>
            <Select
              value={creditDays}
              onChange={v => setCreditDays(v)}
              options={[
                { value: '15', label: '15 días' },
                { value: '30', label: '30 días' },
                { value: '45', label: '45 días' },
                { value: '60', label: '60 días' },
              ]}
            />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              El total <b>{formatCOP(invoice.total)}</b> irá a Cuentas por Cobrar
            </div>
          </>
        )}

        {/* Medio de pago (solo para contado) */}
        {mode !== 'credit' && (
          <>
            <label style={labelSm}>MEDIO DE PAGO</label>
            <Select
              value={method}
              onChange={v => setMethod(v as InvoicePaymentMethod)}
              options={(Object.keys(METHOD_LABELS) as InvoicePaymentMethod[]).map(m => ({ value: m, label: METHOD_LABELS[m] }))}
            />

            <label style={labelSm}>CUENTA QUE RECIBE *</label>
            <Select
              value={accountId}
              onChange={setAccountId}
              options={[
                { value: '', label: 'Seleccionar cuenta…' },
                ...activeAccounts.map(a => ({
                  value: a.id,
                  label: `${a.name} · ${formatCOP(a.currentBalance)}`,
                })),
              ]}
            />
            {accountId === '' && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Elige dónde entra el dinero: sin cuenta el cobro se registra pero
                el saldo de la caja no se mueve.
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn disabled={!canSubmit} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Procesando…'
              : mode === 'full' ? `Cobrar ${formatCOP(invoice.total)}`
              : mode === 'partial' ? `Abonar ${formatCOP(partialVal)}`
              : `Emitir a crédito · ${creditDays} días`}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: registrar pago (parcial o total, validado contra saldo) ───────────

function PaymentModal({ invoice, onClose }: { invoice: SalesInvoiceDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState<InvoicePaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [accountId, setAccountId] = useState('')

  const { data: accounts = [] } = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
  })
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')

  const payMut = useMutation({
    mutationFn: () => salesInvoiceApi.registerPayment(invoice.id, {
      amount: parseFloat(amount), paymentMethod: method,
      financialAccountId: accountId,
      reference: reference.trim() || undefined,
    }),
    onSuccess: inv => {
      invalidarVentas(qc)
      toast(inv.status === 'PAID'
        ? `Factura ${inv.invoiceNumber} pagada por completo`
        : `Pago registrado · saldo ${formatCOP(inv.balance)}`, 'success')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al registrar el pago', 'error')
    },
  })

  const value = parseFloat(amount)
  // Sin cuenta el saldo de la caja no se mueve, así que es obligatoria.
  const valid = value > 0 && value <= invoice.balance && accountId !== ''

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Registrar pago · {invoice.invoiceNumber}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Saldo pendiente: <b style={{ color: 'var(--text)' }}>{formatCOP(invoice.balance)}</b>
        </div>
        <label style={labelSm}>MONTO</label>
        <input style={{ ...inputStyle, marginBottom: 10 }} type="number" min="1" max={invoice.balance}
          value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        {!valid && amount !== '' && (
          <div style={{ fontSize: 12, color: 'var(--neg)', marginTop: -6, marginBottom: 8 }}>
            El monto debe ser mayor a cero y no exceder el saldo.
          </div>
        )}
        <label style={labelSm}>MEDIO DE PAGO</label>
        <Select
          value={method}
          onChange={v => setMethod(v as InvoicePaymentMethod)}
          options={(Object.keys(METHOD_LABELS) as InvoicePaymentMethod[]).map(m => ({ value: m, label: METHOD_LABELS[m] }))}
        />
        <label style={labelSm}>CUENTA QUE RECIBE *</label>
        <Select
          value={accountId}
          onChange={setAccountId}
          options={[
            { value: '', label: 'Seleccionar cuenta…' },
            ...activeAccounts.map(a => ({
              value: a.id,
              label: `${a.name} · ${formatCOP(a.currentBalance)}`,
            })),
          ]}
        />
        {accountId === '' && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -6, marginBottom: 10 }}>
            Elige dónde entra el dinero: sin cuenta el saldo de la caja no se mueve.
          </div>
        )}
        <label style={labelSm}>REFERENCIA (OPCIONAL)</label>
        <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="ej. TX-12345" value={reference}
          onChange={e => setReference(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Volver</GhostBtn>
          <PrimaryBtn disabled={!valid || payMut.isPending} onClick={() => payMut.mutate()}>
            {payMut.isPending ? 'Registrando…' : 'Registrar pago'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Facturación electrónica ──────────────────────────────────────────────────

/**
 * Estado de la factura ante la DIAN.
 *
 * Se muestra siempre que haya proveedor configurado, incluso cuando todo va
 * bien: entre emitir y que la DIAN acepte hay una ventana en la que el
 * documento aún no es legal, y esconderla haría creer que ya lo es.
 */
function ElectronicPanel({ invoiceId, invoiceStatus }: {
  invoiceId: string
  invoiceStatus: SalesInvoiceStatus
}) {
  const qc = useQueryClient()
  const { data: e } = useQuery({
    queryKey: ['einvoicing', invoiceId],
    queryFn: () => einvoicingApi.status(invoiceId),
  })

  const aplicar = (dto: ElectronicStatusDto) => {
    qc.setQueryData(['einvoicing', invoiceId], dto)
    toast(ELECTRONIC_LABELS[dto.status], dto.status === 'ACCEPTED' ? 'success' : 'error')
  }
  const fallo = (err: unknown) =>
    toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'No se pudo contactar al proveedor', 'error')

  const enviar = useMutation({ mutationFn: () => einvoicingApi.submit(invoiceId), onSuccess: aplicar, onError: fallo })
  const consultar = useMutation({ mutationFn: () => einvoicingApi.refresh(invoiceId), onSuccess: aplicar, onError: fallo })

  // Sin proveedor no hay nada que contar: un panel vacío solo ocupa sitio.
  if (!e || (!e.enabled && e.status === 'NOT_SENT')) return null
  // Un borrador todavía no es un documento fiscal.
  if (invoiceStatus === 'DRAFT') return null

  const trabajando = enviar.isPending || consultar.isPending

  return (
    <Card>
      <CardHeader
        title="Facturación electrónica"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {e.provider.toUpperCase()} · {e.environment}
            </span>
            <StatusChip status={ELECTRONIC_CHIP[e.status]} label={ELECTRONIC_LABELS[e.status]} />
          </div>
        }
      />
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {e.cufe && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)' }}>CUFE</div>
            <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--text-2)', wordBreak: 'break-all' }}>
              {e.cufe}
            </div>
          </div>
        )}

        {(e.dianMessage || e.lastError) && (
          <div style={{
            background: e.status === 'ACCEPTED' ? 'var(--pos-bg)' : 'var(--neg-bg)',
            color: e.status === 'ACCEPTED' ? 'var(--pos)' : 'var(--neg)',
            borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6,
          }}>
            {e.lastError ?? e.dianMessage}
            {e.dianCode && <span style={{ opacity: 0.75 }}> · código {e.dianCode}</span>}
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {e.attempts > 0 && <>Intentos: {e.attempts} · </>}
          {e.acceptedAt ? <>Aceptada {fmtDate(e.acceptedAt, true)}</>
            : e.submittedAt ? <>Último envío {fmtDate(e.submittedAt, true)}</>
            : 'Todavía no se ha enviado'}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {e.pdfUrl && <GhostBtn onClick={() => window.open(e.pdfUrl!, '_blank')}>Ver PDF de la DIAN</GhostBtn>}
          {e.xmlUrl && <GhostBtn onClick={() => window.open(e.xmlUrl!, '_blank')}>XML firmado</GhostBtn>}
          {e.status === 'SUBMITTED' && (
            <PrimaryBtn disabled={trabajando} onClick={() => consultar.mutate()}>
              {consultar.isPending ? 'Consultando…' : 'Actualizar estado'}
            </PrimaryBtn>
          )}
          {(e.status === 'PENDING' || e.status === 'FAILED' || e.status === 'NOT_SENT') && (
            <PrimaryBtn disabled={trabajando} onClick={() => enviar.mutate()}>
              {enviar.isPending ? 'Enviando…' : 'Enviar a la DIAN'}
            </PrimaryBtn>
          )}
          {e.status === 'REJECTED' && (
            <GhostBtn disabled={trabajando} onClick={() => enviar.mutate()}>
              Reintentar tras corregir
            </GhostBtn>
          )}
        </div>

        {e.status === 'REJECTED' && (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Un rechazo no se arregla reintentando: corrige lo que señala el mensaje
            —normalmente datos del cliente o de la resolución— y vuelve a enviar.
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Detalle de factura ───────────────────────────────────────────────────────

function InvoiceDetail({ invoiceId, onBack, onEmit, onPay, onCancel }: {
  invoiceId: string
  onBack: () => void
  onEmit: (inv: SalesInvoiceDto) => void
  onPay: (inv: SalesInvoiceDto) => void
  onCancel: (inv: SalesInvoiceDto) => void
}) {
  const setPage = useAppStore(s => s.setPage)
  const { data: d } = useQuery({
    queryKey: ['sales-invoice-detail', invoiceId],
    queryFn: () => salesInvoiceApi.detail(invoiceId),
  })

  const openCustomer = (customerId: string) => {
    window.history.replaceState(null, '', `?customer=${customerId}`)
    setPage('customers')
  }

  if (!d) return <div style={{ padding: 40, color: 'var(--muted)' }}>Cargando factura…</div>
  const inv = d.header

  const box: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px',
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.25s ease' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <GhostBtn style={{ fontSize: 12.5, padding: '6px 12px' }} onClick={onBack}>← Facturas</GhostBtn>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-text)' }}>{inv.invoiceNumber ?? '—'}</span>
            <StatusChip status={STATUS_TO_CHIP[inv.status]} label={STATUS_LABELS[inv.status]} />
            {inv.overdue && <StatusChip status="overdue" label="Vencida" />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Pedido <b>{inv.orderNumber}</b> · Emitida: {fmtDate(inv.issuedAt)} · Vence: {fmtDate(inv.dueDate)}
            {inv.paidAt && <> · Pagada: {fmtDate(inv.paidAt)}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {inv.status === 'DRAFT' && <PrimaryBtn onClick={() => onEmit(inv)}>💰 Cobrar</PrimaryBtn>}
          {(inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && (
            <PrimaryBtn onClick={() => onPay(inv)}>+ Registrar pago</PrimaryBtn>
          )}
          <GhostBtn onClick={() => salesInvoiceApi.downloadPdf(inv.id, `${inv.invoiceNumber ?? inv.id}.pdf`)}>📄 Descargar PDF</GhostBtn>
          {inv.status !== 'CANCELLED' && (
            <GhostBtn style={{ color: 'var(--neg)' }} onClick={() => onCancel(inv)}>✕ Cancelar</GhostBtn>
          )}
        </div>
      </div>

      {/* Emisor y cliente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={box}>
          <div style={labelSm}>EMISOR</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>La Pescadería</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            NIT 000.000.000-0 · Calle del Puerto 12<br />Documento no validado ante DIAN
          </div>
        </div>
        <div style={box}>
          <div style={labelSm}>CLIENTE</div>
          {inv.customerId ? (
            <button onClick={() => openCustomer(inv.customerId!)} title="Ver ficha del cliente"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
              {inv.customerName}
            </button>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700 }}>{inv.customerName}</div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            {d.customerPhone ?? 'Sin teléfono'} · {d.customerEmail ?? 'Sin email'}
          </div>
        </div>
      </div>

      <ElectronicPanel invoiceId={inv.id} invoiceStatus={inv.status} />

      {/* Líneas */}
      <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Descripción</th>
              <th style={thStyle}>Cant.</th>
              <th style={thStyle}>Precio unit.</th>
              <th style={thStyle}>Desc. %</th>
              <th style={thStyle}>IVA %</th>
              <th style={thStyle}>IVA</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{l.description}</td>
                <td style={tdStyle}>{l.quantity}</td>
                <td style={tdStyle}>{formatCOP(l.unitPrice)}</td>
                <td style={tdStyle}>{l.discountPct}%</td>
                <td style={tdStyle}>{l.taxRate}%</td>
                <td style={tdStyle}>{formatCOP(l.taxAmount)}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totales */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300, fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Subtotal</span><span>{formatCOP(d.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Descuentos</span><span>−{formatCOP(d.totalDiscounts)}</span></div>
            {Object.entries(d.taxesByRate).map(([rate, amount]) => (
              <div key={rate} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>IVA {rate}</span><span>{formatCOP(amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '2px solid var(--text)', paddingTop: 7, marginTop: 3 }}>
              <span>Total</span><span>{formatCOP(inv.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos)' }}>
              <span>Pagado</span><span>{formatCOP(inv.paidAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: inv.balance > 0 ? 'var(--neg)' : 'var(--muted)' }}>
              <span>Saldo pendiente</span><span>{formatCOP(inv.balance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* Pagos */}
        <div style={box}>
          <div style={{ ...labelSm, marginBottom: 10 }}>PAGOS ({d.payments.length})</div>
          {d.payments.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin pagos registrados.</div>}
          {d.payments.map(pm => (
            <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(pm.paidOn)} · {METHOD_LABELS[pm.paymentMethod]}{pm.reference ? ` · ${pm.reference}` : ''}</span>
              <b>{formatCOP(pm.amount)}</b>
            </div>
          ))}
          {/* Notas crédito */}
          {d.creditNotes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...labelSm, marginBottom: 8 }}>NOTAS CRÉDITO</div>
              {d.creditNotes.map(nc => (
                <div key={nc.id} style={{ background: 'var(--neg-bg)', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span><b style={{ color: 'var(--neg)' }}>{nc.noteNumber}</b> · {formatCOP(nc.total)} · {fmtDate(nc.issuedAt)}</span>
                    <GhostBtn style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }} title="Descargar PDF de la nota crédito"
                      onClick={() => salesInvoiceApi.downloadCreditNotePdf(nc.id, `${nc.noteNumber}.pdf`)}>📄 PDF</GhostBtn>
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 2 }}>{nc.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial */}
        <div style={box}>
          <div style={{ ...labelSm, marginBottom: 10 }}>HISTORIAL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {d.history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < d.history.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                  {i < d.history.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'var(--border)' }} />}
                </div>
                <div style={{ fontSize: 12.5, paddingBottom: 4 }}>
                  <b>{h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}{STATUS_LABELS[h.toStatus]}</b>
                  <span style={{ color: 'var(--muted)' }}> · {fmtDate(h.changedAt, true)}{h.changedBy ? ` · ${h.changedBy}` : ''}</span>
                  {h.reason && <div style={{ color: 'var(--muted)', marginTop: 2 }}>{h.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {d.notes && (
        <div style={box}>
          <div style={labelSm}>NOTAS</div>
          <div style={{ fontSize: 13.5 }}>{d.notes}</div>
        </div>
      )}
    </div>
  )
}

// ─── Página de Facturación ────────────────────────────────────────────────────

const STATUS_OPTIONS: SalesInvoiceStatus[] = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']
const DATE_PRESETS = [
  { key: '', label: 'Cualquier fecha' },
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'prevMonth', label: 'Mes anterior' },
  { key: 'custom', label: 'Personalizado' },
]

function presetRange(key: string): { from?: string; to?: string } {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (key === 'today') return { from: iso(today), to: iso(today) }
  if (key === '7d') { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: iso(d), to: iso(today) } }
  if (key === 'month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
  if (key === 'prevMonth') {
    return {
      from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  return {}
}

interface Filters {
  q: string
  statuses: SalesInvoiceStatus[]
  preset: string
  from: string
  to: string
  customerId: string
  minTotal: string
  maxTotal: string
  overdueOnly: boolean
}

const EMPTY_FILTERS: Filters = {
  q: '', statuses: [], preset: '', from: '', to: '', customerId: '', minTotal: '', maxTotal: '', overdueOnly: false,
}

/** Lee los filtros desde la URL para que se puedan compartir/recargar. */
function filtersFromUrl(): Filters {
  const p = new URLSearchParams(window.location.search)
  return {
    q: p.get('q') ?? '',
    statuses: (p.get('statuses')?.split(',').filter(Boolean) ?? []) as SalesInvoiceStatus[],
    preset: p.get('preset') ?? '',
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    customerId: p.get('customerId') ?? '',
    minTotal: p.get('minTotal') ?? '',
    maxTotal: p.get('maxTotal') ?? '',
    overdueOnly: p.get('overdueOnly') === 'true',
  }
}

export function Invoicing() {
  const [filters, setFilters] = useState<Filters>(filtersFromUrl)
  const [qInput, setQInput] = useState(filters.q)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [cancelling, setCancelling] = useState<SalesInvoiceDto | null>(null)
  const [emitting, setEmitting] = useState<SalesInvoiceDto | null>(null)
  const [paying, setPaying] = useState<SalesInvoiceDto | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(
    new URLSearchParams(window.location.search).get('invoice'))

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await import('../sales/api/salesApi')).customerApi.listAll(),
  })

  // Debounce de la búsqueda por texto
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => (f.q === qInput ? f : { ...f, q: qInput }))
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [qInput])

  // Persistir filtros en la URL (compartible/recargable)
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.statuses.length) p.set('statuses', filters.statuses.join(','))
    if (filters.preset) p.set('preset', filters.preset)
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (filters.customerId) p.set('customerId', filters.customerId)
    if (filters.minTotal) p.set('minTotal', filters.minTotal)
    if (filters.maxTotal) p.set('maxTotal', filters.maxTotal)
    if (filters.overdueOnly) p.set('overdueOnly', 'true')
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [filters])

  const range = filters.preset === 'custom' ? { from: filters.from || undefined, to: filters.to || undefined } : presetRange(filters.preset)
  const apiParams = {
    q: filters.q || undefined,
    statuses: filters.statuses.length ? filters.statuses : undefined,
    customerId: filters.customerId || undefined,
    from: range.from,
    to: range.to,
    minTotal: filters.minTotal || undefined,
    maxTotal: filters.maxTotal || undefined,
    overdueOnly: filters.overdueOnly || undefined,
  }

  const { data: pageData } = useQuery({
    queryKey: ['sales-invoices-search', apiParams, page, sortField, sortDir],
    queryFn: () => salesInvoiceApi.search({ ...apiParams, page, size: 20, sortField, sortDir }),
  })
  const { data: summary } = useQuery({
    queryKey: ['sales-invoices-summary', apiParams],
    queryFn: () => salesInvoiceApi.summary(apiParams),
  })

  const invoices = pageData?.content ?? []
  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.totalElements / pageData.size)) : 1

  function toggleStatus(st: SalesInvoiceStatus) {
    setFilters(f => ({
      ...f,
      statuses: f.statuses.includes(st) ? f.statuses.filter(x => x !== st) : [...f.statuses, st],
    }))
    setPage(0)
  }

  function sortBy(field: string) {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const activeChips: { label: string; clear: () => void }[] = []
  if (filters.q) activeChips.push({ label: `“${filters.q}”`, clear: () => { setQInput(''); setFilters(f => ({ ...f, q: '' })) } })
  filters.statuses.forEach(st => activeChips.push({ label: STATUS_LABELS[st], clear: () => toggleStatus(st) }))
  if (filters.preset) activeChips.push({ label: DATE_PRESETS.find(d => d.key === filters.preset)?.label ?? filters.preset, clear: () => setFilters(f => ({ ...f, preset: '', from: '', to: '' })) })
  if (filters.customerId) activeChips.push({ label: customers.find(c => c.id === filters.customerId)?.name ?? 'Cliente', clear: () => setFilters(f => ({ ...f, customerId: '' })) })
  if (filters.minTotal || filters.maxTotal) activeChips.push({ label: `${filters.minTotal ? formatCOP(Number(filters.minTotal)) : '…'} – ${filters.maxTotal ? formatCOP(Number(filters.maxTotal)) : '…'}`, clear: () => setFilters(f => ({ ...f, minTotal: '', maxTotal: '' })) })
  if (filters.overdueOnly) activeChips.push({ label: 'Solo vencidas', clear: () => setFilters(f => ({ ...f, overdueOnly: false })) })

  const sortIndicator = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (selectedId) {
    return (
      <>
        {cancelling && <CancelInvoiceModal invoice={cancelling} onClose={() => setCancelling(null)} />}
        {emitting && <DraftPaymentModal invoice={emitting} onClose={() => setEmitting(null)} />}
        {paying && (paying.customerId
          ? <RegisterPaymentModal customerId={paying.customerId} customerName={paying.customerName}
              focusInvoiceId={paying.id} onClose={() => setPaying(null)} />
          : <PaymentModal invoice={paying} onClose={() => setPaying(null)} />)}
        <InvoiceDetail
          invoiceId={selectedId}
          onBack={() => { setSelectedId(null); window.history.replaceState(null, '', window.location.pathname) }}
          onEmit={setEmitting}
          onPay={setPaying}
          onCancel={setCancelling}
        />
      </>
    )
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {cancelling && <CancelInvoiceModal invoice={cancelling} onClose={() => setCancelling(null)} />}
      {emitting && <DraftPaymentModal invoice={emitting} onClose={() => setEmitting(null)} />}
      {paying && (paying.customerId
          ? <RegisterPaymentModal customerId={paying.customerId} customerName={paying.customerName}
              focusInvoiceId={paying.id} onClose={() => setPaying(null)} />
          : <PaymentModal invoice={paying} onClose={() => setPaying(null)} />)}

      {/* KPIs (reflejan los filtros activos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <KpiCard label="Borradores" value={String(summary?.drafts ?? 0)} sub="por emitir" />
        <KpiCard label="Emitidas" value={String((summary?.issued ?? 0) + (summary?.partiallyPaid ?? 0))} sub={`${formatCOP(summary?.pendingBalance ?? 0)} por cobrar`} />
        <KpiCard label="Vencidas" value={String(summary?.overdue ?? 0)} sub={`${formatCOP(summary?.overdueBalance ?? 0)} en riesgo`} />
        <KpiCard label="Pagadas" value={String(summary?.paid ?? 0)} sub={formatCOP(summary?.paidTotal ?? 0)} />
        <KpiCard label="Canceladas" value={String(summary?.cancelled ?? 0)} sub="con novedad" />
      </div>

      <Card>
        <CardHeader title="Facturación de ventas" action={
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Las facturas nacen como borrador desde el pedido en Ventas</span>
        } />

        {/* Barra de filtros combinables */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...inputStyle, width: 240 }} placeholder="Buscar factura, pedido o cliente…"
              value={qInput} onChange={e => setQInput(e.target.value)} />
            <Select
              style={{ width: 160 }}
              value={filters.preset}
              onChange={v => { setFilters(f => ({ ...f, preset: v, from: '', to: '' })); setPage(0) }}
              options={DATE_PRESETS.map(d => ({ value: d.key, label: d.label }))}
            />
            {filters.preset === 'custom' && (
              <>
                <input style={{ ...inputStyle, width: 140 }} type="date" value={filters.from}
                  onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
                <input style={{ ...inputStyle, width: 140 }} type="date" value={filters.to}
                  onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              </>
            )}
            <Select
              style={{ width: 180 }}
              value={filters.customerId}
              onChange={v => { setFilters(f => ({ ...f, customerId: v })); setPage(0) }}
              options={[
                { value: '', label: 'Todos los clientes' },
                ...customers.filter(c => !c.anonymous).map(c => ({ value: c.id, label: c.name })),
              ]}
            />
            <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Monto mín."
              value={filters.minTotal} onChange={e => { setFilters(f => ({ ...f, minTotal: e.target.value })); setPage(0) }} />
            <input style={{ ...inputStyle, width: 110 }} type="number" placeholder="Monto máx."
              value={filters.maxTotal} onChange={e => { setFilters(f => ({ ...f, maxTotal: e.target.value })); setPage(0) }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={filters.overdueOnly}
                onChange={e => { setFilters(f => ({ ...f, overdueOnly: e.target.checked })); setPage(0) }} />
              Solo vencidas
            </label>
          </div>

          {/* Estados como chips conmutables (multi-select) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>ESTADOS:</span>
            {STATUS_OPTIONS.map(st => (
              <button key={st} type="button" onClick={() => toggleStatus(st)}
                style={{
                  border: filters.statuses.includes(st) ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: filters.statuses.includes(st) ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
                  borderRadius: 100, padding: '2px 4px', cursor: 'pointer',
                }}>
                <StatusChip status={STATUS_TO_CHIP[st]} label={STATUS_LABELS[st]} />
              </button>
            ))}
          </div>

          {/* Chips de filtros activos */}
          {activeChips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Filtros:</span>
              {activeChips.map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                  background: 'var(--surface-2)', borderRadius: 100, padding: '3px 10px', color: 'var(--text)',
                }}>
                  {c.label}
                  <button onClick={c.clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px' }}
                onClick={() => { setQInput(''); setFilters(EMPTY_FILTERS); setPage(0) }}>
                Limpiar todo
              </GhostBtn>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('invoiceNumber')}>Factura{sortIndicator('invoiceNumber')}</th>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Cliente</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('issuedAt')}>Emitida{sortIndicator('issuedAt')}</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('dueDate')}>Vence{sortIndicator('dueDate')}</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('total')}>Total{sortIndicator('total')}</th>
                <th style={thStyle}>Saldo</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => sortBy('status')}>Estado{sortIndicator('status')}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>
                    <button
                      onClick={() => { setSelectedId(inv.id); window.history.replaceState(null, '', `?invoice=${inv.id}`) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
                      {inv.invoiceNumber ?? '—'}
                    </button>
                  </td>
                  <td style={tdStyle}>{inv.orderNumber}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{inv.customerName}</td>
                  <td style={tdStyle}>{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td style={{ ...tdStyle, color: inv.overdue ? 'var(--neg)' : undefined, fontWeight: inv.overdue ? 700 : undefined }}>
                    {inv.dueDate ? new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(inv.total)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: inv.balance > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' ? 'var(--neg)' : 'var(--muted)' }}>
                    {inv.status === 'DRAFT' || inv.status === 'CANCELLED' ? '—' : formatCOP(inv.balance)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <StatusChip status={STATUS_TO_CHIP[inv.status]} label={STATUS_LABELS[inv.status]} />
                        {inv.overdue && <StatusChip status="overdue" label="Vencida" />}
                      </div>
                      {inv.status === 'CANCELLED' && inv.cancelReason && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.cancelReason}</span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'DRAFT' && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--pos)' }}
                          onClick={() => setEmitting(inv)}>💰 Cobrar</GhostBtn>
                      )}
                      {(inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--pos)' }}
                          onClick={() => setPaying(inv)}>+ Pago</GhostBtn>
                      )}
                      <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px' }} title="Descargar PDF"
                        onClick={() => salesInvoiceApi.downloadPdf(inv.id, `${inv.invoiceNumber ?? inv.id}.pdf`)}>📄 PDF</GhostBtn>
                      {inv.status !== 'CANCELLED' && (
                        <GhostBtn style={{ fontSize: 11.5, padding: '3px 9px', color: 'var(--neg)' }}
                          onClick={() => setCancelling(inv)}>✕</GhostBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>
                  Sin facturas con estos filtros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {pageData?.totalElements ?? 0} facturas · página {page + 1} de {totalPages}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <GhostBtn style={{ fontSize: 12, padding: '4px 12px' }} disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}>← Anterior</GhostBtn>
            <GhostBtn style={{ fontSize: 12, padding: '4px 12px' }} disabled={page + 1 >= totalPages}
              onClick={() => setPage(p => p + 1)}>Siguiente →</GhostBtn>
          </div>
        </div>
      </Card>
    </div>
  )
}
