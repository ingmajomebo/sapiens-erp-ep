import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { toast } from '../../shared/toast'
import { productApi } from '../catalog/api/productApi'
import {
  salesOrderApi, customerApi, salesLinkApi,
  type SalesOrderDto, type SalesOrderStatus,
} from './api/salesApi'

const STATUS_TO_CHIP: Record<SalesOrderStatus, string> = {
  PENDING: 'pending', CONFIRMED: 'confirmed', DELIVERED: 'delivered', CANCELLED: 'cancelled',
}

/** Transiciones válidas del MVP (espejo del backend): PENDING→CONFIRMED|CANCELLED, CONFIRMED→DELIVERED|CANCELLED */
const NEXT_ACTIONS: Partial<Record<SalesOrderStatus, { status: SalesOrderStatus; label: string }[]>> = {
  PENDING: [{ status: 'CONFIRMED', label: 'Confirmar' }, { status: 'CANCELLED', label: 'Cancelar' }],
  CONFIRMED: [{ status: 'DELIVERED', label: 'Entregar' }, { status: 'CANCELLED', label: 'Cancelar' }],
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}

// ─── Modal: nuevo pedido (canal administrativo) ───────────────────────────────

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [customerId, setCustomerId] = useState('')
  const [contactName, setContactName] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([{ productId: '', quantity: '' }])

  const { data: productsPage } = useQuery({ queryKey: ['products'], queryFn: () => productApi.listAll() })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customerApi.listAll })
  const products = (productsPage?.content ?? []).filter(p => p.active && p.salePrice != null)

  const createMut = useMutation({
    mutationFn: () => salesOrderApi.create({
      customerId: customerId || null,
      contactName: !customerId && contactName.trim() ? contactName.trim() : undefined,
      notes: notes.trim() || undefined,
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14, padding: '22px 26px', width: '100%',
        maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nuevo pedido</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>

        {/* Cliente: existente o anónimo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CLIENTE</label>
            <select style={inputStyle} value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Cliente anónimo</option>
              {customers.filter(c => !c.anonymous).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!customerId && (
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>NOMBRE DE CONTACTO (OPCIONAL)</label>
              <input style={inputStyle} placeholder="ej. Restaurante El Puerto" value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
          )}
        </div>

        {/* Líneas */}
        <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>LÍNEAS DEL PEDIDO</label>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select style={{ ...inputStyle, flex: 1 }} value={line.productId}
              onChange={e => setLines(ls => ls.map((l, j) => j === i ? { ...l, productId: e.target.value } : l))}>
              <option value="">Selecciona producto…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — €{p.salePrice?.toFixed(2)}</option>)}
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
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>NOTAS</label>
          <textarea style={{ ...inputStyle, minHeight: 52, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Total: €{total.toFixed(2)}</span>
          <PrimaryBtn
            disabled={validLines.length === 0 || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Creando…' : 'Crear pedido'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Página de Ventas ─────────────────────────────────────────────────────────

export function Sales() {
  const { lang } = useAppStore()
  const t = translations[lang]
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewOrder, setShowNewOrder] = useState(false)

  const { data: orders = [] } = useQuery({ queryKey: ['sales-orders'], queryFn: () => salesOrderApi.list() })
  const { data: links = [] } = useQuery({ queryKey: ['sales-order-links'], queryFn: salesLinkApi.listAll })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesOrderStatus }) => salesOrderApi.updateStatus(id, status),
    onSuccess: o => { qc.invalidateQueries({ queryKey: ['sales-orders'] }); toast(`Pedido ${o.orderNumber} → ${o.status}`, 'success') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'Error al cambiar el estado', 'error')
    },
  })

  const createLinkMut = useMutation({
    mutationFn: () => salesLinkApi.create('Enlace de pedidos'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-order-links'] }); toast('Enlace público creado', 'success') },
    onError: () => toast('Error al crear el enlace (requiere rol SUPERVISOR o ADMIN)', 'error'),
  })

  const toggleLinkMut = useMutation({
    mutationFn: (id: string) => salesLinkApi.toggle(id),
    onSuccess: l => { qc.invalidateQueries({ queryKey: ['sales-order-links'] }); toast(l.active ? 'Enlace activado' : 'Enlace desactivado', 'success') },
  })

  const filtered = orders.filter(o => statusFilter === 'all' || STATUS_TO_CHIP[o.status] === statusFilter)
  const pending = orders.filter(o => o.status === 'PENDING').length
  const confirmedTotal = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED')
    .reduce((acc, o) => acc + o.total, 0)

  const statusLabelMap: Record<string, string> = {
    pending: t.ss_pending, confirmed: t.ss_confirmed, delivered: t.ss_delivered, cancelled: t.ss_cancelled,
  }

  function publicUrl(token: string) {
    return `${window.location.origin}/pedido/${token}`
  }

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>
      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.sa_orders} value={String(orders.length)} sub="pedidos totales" />
        <KpiCard label={t.ss_pending} value={String(pending)} sub="por confirmar" />
        <KpiCard label={t.sa_revenue} value={`€${confirmedTotal.toFixed(2)}`} sub="confirmado + entregado" />
        <KpiCard label="Canal público" value={String(orders.filter(o => o.channel === 'PUBLIC').length)} sub="pedidos por enlace" />
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
              <StatusChip status={l.active ? 'confirmed' : 'cancelled'} label={l.active ? 'Activo' : 'Inactivo'} />
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
        <CardHeader title={t.nav_sales} action={
          <PrimaryBtn onClick={() => setShowNewOrder(true)}>+ Nuevo pedido</PrimaryBtn>
        } />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all', label: t.fil_allstatus },
            { value: 'pending', label: t.ss_pending },
            { value: 'confirmed', label: t.ss_confirmed },
            { value: 'delivered', label: t.ss_delivered },
            { value: 'cancelled', label: t.ss_cancelled },
          ]} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t.th_order}</th>
                <th style={thStyle}>{t.th_customer}</th>
                <th style={thStyle}>Canal</th>
                <th style={thStyle}>{t.th_date}</th>
                <th style={thStyle}>{t.th_items}</th>
                <th style={thStyle}>{t.th_total}</th>
                <th style={thStyle}>{t.th_status}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 12.5 }}>{o.orderNumber}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>
                    {o.customerName}{o.customerAnonymous && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (anónimo)</span>}
                  </td>
                  <td style={tdStyle}>{o.channel === 'PUBLIC' ? '🌐 Público' : '🏪 Panel'}</td>
                  <td style={tdStyle}>{new Date(o.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</td>
                  <td style={tdStyle}>{o.lines.length}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>€{o.total.toFixed(2)}</td>
                  <td style={tdStyle}><StatusChip status={STATUS_TO_CHIP[o.status]} label={statusLabelMap[STATUS_TO_CHIP[o.status]] ?? o.status} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(NEXT_ACTIONS[o.status] ?? []).map(a => (
                        <GhostBtn key={a.status} style={{ fontSize: 11.5, padding: '3px 9px' }}
                          onClick={() => statusMut.mutate({ id: o.id, status: a.status })}>
                          {a.label}
                        </GhostBtn>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Sin pedidos todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {t.showing} <b style={{ color: 'var(--text-2)' }}>{filtered.length}</b> {t.of} {orders.length}
          </span>
        </div>
      </Card>
    </div>
  )
}
