import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect, PaginationFooter,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { formatCOP } from '../../shared/currency'
import { productApi } from '../catalog/api/productApi'
import { CustomerFormModal } from '../customers/Customers'
import {
  salesOrderApi, customerApi, salesLinkApi,
  type SalesOrderDto, type SalesOrderStatus, type DeliveryMethod,
} from './api/salesApi'

export const ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  PENDING: 'Pendiente', PREPARING: 'En preparación', DISPATCHED: 'En despacho',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}
/** Mapea al vocabulario de StatusChip para heredar sus colores (warn/pos/neg). */
const STATUS_TO_CHIP: Record<SalesOrderStatus, string> = {
  PENDING: 'pending', PREPARING: 'partial', DISPATCHED: 'ordered',
  DELIVERED: 'delivered', CANCELLED: 'critical',
}

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: '🏪 Recogida en local', DELIVERY: '🛵 Domicilio',
}

/** Transiciones del ciclo operativo (espejo del backend). */
const NEXT_ACTIONS: Partial<Record<SalesOrderStatus, { status: SalesOrderStatus; label: string }>> = {
  PENDING: { status: 'PREPARING', label: '▶ Preparar' },
  PREPARING: { status: 'DISPATCHED', label: '📦 Despachar' },
  DISPATCHED: { status: 'DELIVERED', label: '✓ Entregar' },
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
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%',
  maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
}

// ─── Modal: detalle del pedido (qué empacar + acciones) ───────────────────────

function OrderDetailModal({ order, onClose }: { order: SalesOrderDto; onClose: () => void }) {
  const qc = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sales-orders'] })
    qc.invalidateQueries({ queryKey: ['sales-invoices'] })
  }

  const statusMut = useMutation({
    mutationFn: (status: SalesOrderStatus) => salesOrderApi.updateStatus(order.id, status),
    onSuccess: o => { invalidate(); toast(`${o.orderNumber} → ${ORDER_STATUS_LABELS[o.status]}`, 'success'); onClose() },
    onError: (e: unknown) => toast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cambiar el estado', 'error'),
  })
  const cancelMut = useMutation({
    mutationFn: () => salesOrderApi.cancel(order.id, cancelReason),
    onSuccess: o => { invalidate(); toast(`${o.orderNumber} cancelado`, 'info'); onClose() },
    onError: (e: unknown) => toast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cancelar', 'error'),
  })
  const invoiceMut = useMutation({
    mutationFn: () => salesOrderApi.issueInvoice(order.id),
    onSuccess: inv => { invalidate(); toast(`Factura ${inv.invoiceNumber} generada`, 'success'); onClose() },
    onError: (e: unknown) => toast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al generar la factura', 'error'),
  })

  const next = NEXT_ACTIONS[order.status]
  const cancellable = ['PENDING', 'PREPARING', 'DISPATCHED'].includes(order.status)

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-text)' }}>{order.orderNumber}</span>
              <StatusChip status={STATUS_TO_CHIP[order.status]} label={ORDER_STATUS_LABELS[order.status]} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {order.customerName}{order.customerAnonymous ? ' (anónimo)' : ''} · {order.channel === 'PUBLIC' ? 'Canal público' : 'Panel'} · {new Date(order.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>

        {/* Entrega */}
        <div style={{
          background: 'var(--surface-2)', borderRadius: 10, padding: '11px 14px', marginBottom: 14,
          fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div><b>{DELIVERY_LABELS[order.deliveryMethod]}</b></div>
          {order.deliveryMethod === 'DELIVERY' && (
            <div style={{ color: 'var(--muted)' }}>📍 {order.deliveryAddress ?? 'Sin dirección registrada'}</div>
          )}
          {order.notes && <div style={{ color: 'var(--muted)' }}>📝 {order.notes}</div>}
        </div>

        {/* Qué empacar */}
        <div style={{ ...labelSm, marginBottom: 8 }}>QUÉ EMPACAR ({order.lines.length} líneas)</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
          {order.lines.map((l, i) => (
            <div key={l.productId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px', fontSize: 13.5,
              borderBottom: i < order.lines.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span><b>{l.quantity}</b> × {l.productName}</span>
              <span style={{ fontWeight: 600 }}>{formatCOP(l.lineTotal)}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
            fontWeight: 800, fontSize: 14, background: 'var(--surface-2)',
          }}>
            <span>Total</span><span>{formatCOP(order.total)}</span>
          </div>
        </div>

        {/* Novedad de cancelación */}
        {order.status === 'CANCELLED' && order.cancelReason && (
          <div style={{ background: 'var(--neg-bg)', color: 'var(--neg)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
            <b>Novedad:</b> {order.cancelReason}
          </div>
        )}

        {/* Factura */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
          {order.invoiceNumber ? (
            <>
              <span style={{ color: 'var(--muted)' }}>Factura:</span>
              <b>{order.invoiceNumber}</b>
              <StatusChip
                status={order.invoiceStatus === 'PAID' ? 'paid' : order.invoiceStatus === 'CANCELLED' ? 'critical' : order.invoiceStatus === 'DRAFT' ? 'draft' : order.invoiceStatus === 'PARTIALLY_PAID' ? 'partial' : 'issued'}
                label={order.invoiceStatus === 'PAID' ? 'Pagada' : order.invoiceStatus === 'CANCELLED' ? 'Cancelada' : order.invoiceStatus === 'DRAFT' ? 'Borrador' : order.invoiceStatus === 'PARTIALLY_PAID' ? 'Pago parcial' : 'Emitida'}
              />
            </>
          ) : (
            <span style={{ color: 'var(--muted)' }}>Sin factura generada.</span>
          )}
        </div>

        {/* Acciones */}
        {!showCancel ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {cancellable && (
              <GhostBtn style={{ color: 'var(--neg)' }} onClick={() => setShowCancel(true)}>✕ Cancelar pedido</GhostBtn>
            )}
            {!order.invoiceNumber && order.status !== 'CANCELLED' && (
              <GhostBtn onClick={() => invoiceMut.mutate()} disabled={invoiceMut.isPending}>
                🧾 Generar factura
              </GhostBtn>
            )}
            {next && (
              <PrimaryBtn onClick={() => statusMut.mutate(next.status)} disabled={statusMut.isPending}>
                {next.label}
              </PrimaryBtn>
            )}
          </div>
        ) : (
          <div>
            <label style={labelSm}>NOVEDAD DE CANCELACIÓN (OBLIGATORIA)</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              placeholder="ej. El cliente no contestó / producto agotado…"
              value={cancelReason} onChange={e => setCancelReason(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
              <GhostBtn onClick={() => setShowCancel(false)}>Volver</GhostBtn>
              <PrimaryBtn style={{ background: 'var(--neg)' }} disabled={!cancelReason.trim() || cancelMut.isPending}
                onClick={() => cancelMut.mutate()}>
                Confirmar cancelación
              </PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal: nuevo pedido (canal administrativo) ───────────────────────────────

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [customerId, setCustomerId] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [contactName, setContactName] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([{ productId: '', quantity: '' }])

  const { data: productsPage } = useQuery({ queryKey: ['products'], queryFn: () => productApi.listAll() })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customerApi.listAll })
  const products = (productsPage?.content ?? []).filter(p => p.active && p.salePrice != null)

  const createMut = useMutation({
    mutationFn: () => salesOrderApi.create({
      customerId: customerId || null,
      contactName: !customerId && contactName.trim() ? contactName.trim() : undefined,
      notes: notes.trim() || undefined,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress.trim() : undefined,
      lines: lines
        .filter(l => l.productId && parseFloat(l.quantity) > 0)
        .map(l => ({ productId: l.productId, quantity: parseFloat(l.quantity) })),
    }),
    onSuccess: order => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast(`Pedido ${order.orderNumber} creado`, 'success')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al crear el pedido', 'error')
    },
  })

  const validLines = lines.filter(l => l.productId && parseFloat(l.quantity) > 0)
  const total = validLines.reduce((acc, l) => {
    const p = products.find(pr => pr.id === l.productId)
    return acc + (p?.salePrice ?? 0) * parseFloat(l.quantity)
  }, 0)
  const deliveryOk = deliveryMethod === 'PICKUP' || deliveryAddress.trim() !== ''

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nuevo pedido</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelSm}>CLIENTE</label>
              <button type="button" onClick={() => setCreatingCustomer(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                + Nuevo
              </button>
            </div>
            <select style={inputStyle} value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Cliente anónimo</option>
              {customers.filter(c => !c.anonymous).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!customerId && (
            <div>
              <label style={labelSm}>NOMBRE DE CONTACTO (OPCIONAL)</label>
              <input style={inputStyle} placeholder="ej. Restaurante El Puerto" value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
          )}
        </div>

        {/* Entrega */}
        <label style={labelSm}>ENTREGA</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {(['PICKUP', 'DELIVERY'] as DeliveryMethod[]).map(m => (
            <button key={m} type="button" onClick={() => setDeliveryMethod(m)}
              style={{
                ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: deliveryMethod === m ? 700 : 500,
                borderColor: deliveryMethod === m ? 'var(--accent)' : 'var(--border)',
                background: deliveryMethod === m ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg)',
              }}>
              {DELIVERY_LABELS[m]}
            </button>
          ))}
        </div>
        {deliveryMethod === 'DELIVERY' && (
          <div style={{ marginBottom: 14 }}>
            <input style={inputStyle} placeholder="Dirección de entrega *" value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)} />
          </div>
        )}

        {/* Líneas */}
        <label style={labelSm}>LÍNEAS DEL PEDIDO</label>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select style={{ ...inputStyle, flex: 1 }} value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value } : l))}>
              <option value="">Selecciona producto…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCOP(p.salePrice ?? 0)}</option>)}
            </select>
            <input style={{ ...inputStyle, width: 90 }} type="number" min="0" step="0.5" placeholder="Cant."
              value={line.quantity}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, quantity: e.target.value } : l))} />
            {lines.length > 1 && (
              <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>🗑️</button>
            )}
          </div>
        ))}
        <GhostBtn style={{ fontSize: 12, padding: '5px 10px', marginBottom: 14 }}
          onClick={() => setLines(ls => [...ls, { productId: '', quantity: '' }])}>
          + Añadir línea
        </GhostBtn>

        <div style={{ marginBottom: 16 }}>
          <label style={labelSm}>NOTAS</label>
          <textarea style={{ ...inputStyle, minHeight: 52, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Total: {formatCOP(total)}</span>
          <PrimaryBtn
            disabled={validLines.length === 0 || !deliveryOk || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Creando…' : 'Crear pedido'}
          </PrimaryBtn>
        </div>
      </div>
      {creatingCustomer && (
        <CustomerFormModal
          onClose={() => setCreatingCustomer(false)}
          onSaved={c => setCustomerId(c.id)}
        />
      )}
    </div>
  )
}

// ─── Página de Ventas ─────────────────────────────────────────────────────────

export function Sales() {
  const { lang } = useAppStore()
  const t = translations[lang]
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderPage, setOrderPage] = useState(0)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [detail, setDetail] = useState<SalesOrderDto | null>(null)

  const { data: orders = [] } = useQuery({ queryKey: ['sales-orders'], queryFn: () => salesOrderApi.list() })
  const { data: links = [] } = useQuery({ queryKey: ['sales-order-links'], queryFn: salesLinkApi.listAll })

  const createLinkMut = useMutation({
    mutationFn: () => salesLinkApi.create('Enlace de pedidos'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-order-links'] }); toast('Enlace público creado', 'success') },
    onError: () => toast('Error al crear el enlace (requiere rol SUPERVISOR o ADMIN)', 'error'),
  })
  const toggleLinkMut = useMutation({
    mutationFn: (id: string) => salesLinkApi.toggle(id),
    onSuccess: l => { qc.invalidateQueries({ queryKey: ['sales-order-links'] }); toast(l.active ? 'Enlace activado' : 'Enlace desactivado', 'success') },
  })

  const PAGE_SIZE = 12
  const oq = orderSearch.trim().toLowerCase()
  const filtered = orders.filter(o =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    (!oq || o.orderNumber.toLowerCase().includes(oq)
      || o.customerName.toLowerCase().includes(oq)
      || (o.invoiceNumber ?? '').toLowerCase().includes(oq)))
  const paged = filtered.slice(orderPage * PAGE_SIZE, (orderPage + 1) * PAGE_SIZE)
  const count = (s: SalesOrderStatus) => orders.filter(o => o.status === s).length
  const revenue = orders.filter(o => ['PREPARING', 'DISPATCHED', 'DELIVERED'].includes(o.status))
    .reduce((acc, o) => acc + o.total, 0)

  function publicUrl(token: string) {
    return `${window.location.origin}/pedido/${token}`
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}
      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Pendientes" value={String(count('PENDING'))} sub="por preparar" />
        <KpiCard label="En preparación" value={String(count('PREPARING'))} sub="empacando" />
        <KpiCard label="En despacho" value={String(count('DISPATCHED'))} sub="listos o en camino" />
        <KpiCard label={t.sa_revenue} value={formatCOP(revenue)} sub="en curso + entregado" />
      </div>

      {/* Enlace público */}
      <Card>
        <CardHeader title="Enlace público de pedidos" action={
          links.length === 0
            ? <PrimaryBtn onClick={() => createLinkMut.mutate()}>+ Generar enlace</PrimaryBtn>
            : <GhostBtn style={{ fontSize: 12, padding: '6px 11px' }} onClick={() => createLinkMut.mutate()}>+ Otro enlace</GhostBtn>
        } />
        <div style={{ padding: '4px 18px 14px' }}>
          {links.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Genera un enlace y compártelo: tus clientes podrán hacer pedidos sin necesidad de cuenta.
            </span>
          )}
          {links.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', flexWrap: 'wrap' }}>
              <StatusChip status={l.active ? 'confirmed' : 'critical'} label={l.active ? 'Activo' : 'Inactivo'} />
              <code style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 380 }}>
                {publicUrl(l.token)}
              </code>
              <GhostBtn style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => {
                navigator.clipboard.writeText(publicUrl(l.token))
                toast('Enlace copiado al portapapeles', 'success')
              }}>Copiar</GhostBtn>
              <GhostBtn style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => toggleLinkMut.mutate(l.id)}>
                {l.active ? 'Desactivar' : 'Activar'}
              </GhostBtn>
            </div>
          ))}
        </div>
      </Card>

      {/* Pedidos */}
      <Card>
        <CardHeader title="Pedidos" action={
          <PrimaryBtn onClick={() => setShowNewOrder(true)}>+ Nuevo pedido</PrimaryBtn>
        } />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <input
            value={orderSearch}
            onChange={e => { setOrderSearch(e.target.value); setOrderPage(0) }}
            placeholder="Buscar por pedido, cliente o factura…"
            style={{
              width: 250, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
            }}
          />
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setOrderPage(0) }} options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'PREPARING', label: 'En preparación' },
            { value: 'DISPATCHED', label: 'En despacho' },
            { value: 'DELIVERED', label: 'Entregados' },
            { value: 'CANCELLED', label: 'Cancelados' },
          ]} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Canal</th>
                <th style={thStyle}>Entrega</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Factura</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(o => (
                <tr key={o.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetail(o)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{o.orderNumber}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>
                    {o.customerName}{o.customerAnonymous && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (anónimo)</span>}
                  </td>
                  <td style={tdStyle}>{o.channel === 'PUBLIC' ? '🌐 Público' : '🏪 Panel'}</td>
                  <td style={tdStyle}>{o.deliveryMethod === 'DELIVERY' ? '🛵 Domicilio' : '🏪 Recogida'}</td>
                  <td style={tdStyle}>{new Date(o.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{formatCOP(o.total)}</td>
                  <td style={tdStyle}>
                    {o.invoiceNumber
                      ? <span style={{ fontSize: 12 }}>{o.invoiceNumber}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={tdStyle}><StatusChip status={STATUS_TO_CHIP[o.status]} label={ORDER_STATUS_LABELS[o.status]} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Sin pedidos con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter total={filtered.length} page={orderPage} pageSize={PAGE_SIZE}
          onPage={setOrderPage} unit="pedidos" />

        <div style={{ padding: '12px 18px' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {t.showing} <b style={{ color: 'var(--text-2)' }}>{filtered.length}</b> {t.of} {orders.length} · clic en un pedido para ver el detalle
          </span>
        </div>
      </Card>
    </div>
  )
}
