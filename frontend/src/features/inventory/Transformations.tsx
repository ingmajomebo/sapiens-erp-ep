import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card, CardHeader, KpiCard, StatusChip, PrimaryBtn, GhostBtn, Select,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'
import { inventoryApi } from './api/inventoryApi'
import { warehouseApi } from './api/warehouseApi'
import { productApi } from '../catalog/api/productApi'
import {
  transformationApi,
  type TransformationDto,
  type TransformationLineDto,
  type TransformationSide,
} from './api/transformationApi'

/* ============================================================================
   Transformaciones de inventario.

   La pantalla nombra los dos lados por lo que le pasa al INVENTARIO. Es el
   punto donde más se equivoca la gente: "entrada" y "salida" significan lo
   contrario según se mire desde el documento o desde la bodega.
   ========================================================================== */

const CONSUMED_TITLE = 'Productos consumidos'
const CONSUMED_HINT = 'SALEN DEL INVENTARIO'
const OBTAINED_TITLE = 'Productos obtenidos'
const OBTAINED_HINT = 'ENTRAN AL INVENTARIO'

export function Transformations() {
  const qc = useQueryClient()
  const [openId, setOpenId] = useState<string | null>(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['transformations'],
    queryFn: transformationApi.list,
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.listAll,
  })

  const createMut = useMutation({
    mutationFn: () => transformationApi.create({
      transformationDate: new Date().toISOString().slice(0, 10),
      warehouseId: warehouses[0]?.id,
    }),
    onSuccess: doc => {
      qc.invalidateQueries({ queryKey: ['transformations'] })
      setOpenId(doc.id)
    },
    onError: () => toast('No se pudo crear la transformación', 'error'),
  })

  if (openId) {
    return <TransformationDetail id={openId} onBack={() => setOpenId(null)} />
  }

  const borradores = docs.filter(d => d.status === 'DRAFT').length
  const confirmadas = docs.filter(d => d.status === 'CONFIRMED').length
  const sinCostear = docs.filter(d => d.costingStatus === 'UNCOSTED').length

  return (
    <div style={pageStyle}>
      {/* El título lo pone la barra superior: repetirlo aquí lo duplicaba */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Transformaciones" value={String(docs.length)} sub="en total" />
        <KpiCard label="Borradores" value={String(borradores)} sub="sin confirmar" />
        <KpiCard label="Confirmadas" value={String(confirmadas)} sub="con movimientos" />
        <KpiCard label="Sin costear" value={String(sinCostear)}
                 color={sinCostear > 0 ? 'var(--warn)' : undefined} sub="falta costo real" />
      </div>

      <Card>
        <CardHeader
          title="Transformaciones"
          action={
            <PrimaryBtn onClick={() => createMut.mutate()} loading={createMut.isPending}>
              + Nueva transformación
            </PrimaryBtn>
          }
        />

        {isLoading && <p style={emptyText}>Cargando…</p>}

        {!isLoading && docs.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
              Todavía no hay transformaciones
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
              Una transformación registra que 20 kg de atún entero se convirtieron
              en filete, medallones, recortes y merma.
            </div>
          </div>
        )}

        {docs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Número</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Bodega</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Consume</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Obtiene</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Rendimiento</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Costo</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} style={rowStyle} onClick={() => setOpenId(d.id)}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)' }}>{d.number}</td>
                    <td style={tdStyle}>{d.transformationDate}</td>
                    <td style={tdStyle}>{d.warehouseName ?? '—'}</td>
                    <td style={numTd}>{d.consumed.length}</td>
                    <td style={numTd}>{d.obtained.length}</td>
                    <td style={numTd}><YieldLabel doc={d} /></td>
                    <td style={numTd}><CostLabel doc={d} /></td>
                    <td style={tdStyle}><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Detalle y captura ─────────────────────────────────────────────────────── */

function TransformationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const { data: doc } = useQuery({
    queryKey: ['transformation', id],
    queryFn: () => transformationApi.get(id),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transformation', id] })
    qc.invalidateQueries({ queryKey: ['transformations'] })
    // El inventario cambió: las pantallas de stock deben reflejarlo
    qc.invalidateQueries({ queryKey: ['inventory-stock'] })
  }

  const confirmMut = useMutation({
    mutationFn: () => transformationApi.confirm(id),
    onSuccess: d => { refresh(); toast(`${d.number} confirmada`, 'success') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudo confirmar', 'error')
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => transformationApi.cancel(id, reason.trim()),
    onSuccess: d => {
      refresh(); setCancelling(false); setReason('')
      toast(`${d.number} anulada`, 'info')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudo anular', 'error')
    },
  })

  if (!doc) return <p style={{ color: 'var(--muted)' }}>Cargando…</p>

  const editable = doc.status === 'DRAFT'

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <GhostBtn onClick={onBack}>← Volver</GhostBtn>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{doc.number}</span>
        <StatusBadge status={doc.status} />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {doc.transformationDate} · {doc.warehouseName ?? 'Sin bodega'}
          {doc.confirmedBy && ` · confirmada por ${doc.confirmedBy}`}
          {doc.cancelledBy && ` · anulada por ${doc.cancelledBy}`}
        </span>
      </div>

      {doc.cancelReason && (
        <Card style={{ padding: '12px 16px', borderColor: 'var(--neg)', background: 'var(--neg-bg)' }}>
          <span style={{ fontSize: 13, color: 'var(--neg)' }}>
            <b>Anulada:</b> {doc.cancelReason}
          </span>
        </Card>
      )}

      <Warnings doc={doc} />
      <Summary doc={doc} />

      <LineSection
        doc={doc} side="CONSUMED" title={CONSUMED_TITLE} hint={CONSUMED_HINT}
        editable={editable} onChanged={refresh}
      />
      <LineSection
        doc={doc} side="OBTAINED" title={OBTAINED_TITLE} hint={OBTAINED_HINT}
        editable={editable} onChanged={refresh}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        {editable && (
          <PrimaryBtn loading={confirmMut.isPending} onClick={() => confirmMut.mutate()}>
            ✓ Confirmar transformación
          </PrimaryBtn>
        )}
        {doc.status === 'CONFIRMED' && !cancelling && (
          <GhostBtn onClick={() => setCancelling(true)}
                    style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}>
            ✕ Anular
          </GhostBtn>
        )}
      </div>

      {cancelling && (
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>
            Anular genera movimientos inversos. El documento se conserva con su historia.
          </div>
          <input
            style={inputStyle}
            placeholder="Motivo de la anulación (obligatorio)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <GhostBtn onClick={() => setCancelling(false)}>Volver</GhostBtn>
            <PrimaryBtn loading={cancelMut.isPending}
                        disabled={reason.trim().length < 3}
                        onClick={() => cancelMut.mutate()}>
              Confirmar anulación
            </PrimaryBtn>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Resumen en vivo ───────────────────────────────────────────────────────── */

function Summary({ doc }: { doc: TransformationDto }) {
  const consumida = sumBase(doc.consumed)
  const obtenida = sumBase(doc.obtained.filter(l => l.lineKind === 'PRODUCT'))
  const valorVenta = doc.obtained
    .filter(l => l.lineKind === 'PRODUCT')
    .reduce((a, l) => a + (l.saleValue ?? (l.referenceSalePrice ?? 0) * l.quantity), 0)

  const rendimiento = !doc.yieldCalculable || doc.yieldPercentage == null
    ? 'No calculable'
    : `${pct(doc.yieldPercentage)}%`
  const sobrePasado = doc.yieldPercentage != null && doc.yieldPercentage > 100

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Rendimiento" value={rendimiento}
                 color={sobrePasado ? 'var(--warn)' : undefined}
                 sub={doc.wastePercentage != null ? `merma ${pct(doc.wastePercentage)}%` : undefined} />
        <KpiCard label="Consumido"
                 value={consumida === null ? '—' : `${consumida} kg`}
                 sub="sale del inventario" />
        <KpiCard label="Obtenido"
                 value={obtenida === null ? '—' : `${obtenida} kg`}
                 sub="entra al inventario" />
        <KpiCard label="Costo consumido"
                 value={doc.costingStatus === 'UNCOSTED' ? 'Sin costear'
                        : doc.inputTotalCost != null ? formatCOP(doc.inputTotalCost) : '—'}
                 color={doc.costingStatus === 'UNCOSTED' ? 'var(--warn)' : undefined}
                 sub={valorVenta > 0 ? `venta est. ${formatCOP(valorVenta)}` : undefined} />
      </div>

      <Card style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 5 }}>
          Método de distribución del costo:{' '}
          <b style={{ color: 'var(--text)' }}>Por valor de venta</b>
        </div>
        {/* El texto viene del backend: la interfaz no puede olvidarse de mostrarlo */}
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
          {doc.costMethodNotice}
        </div>
      </Card>
    </>
  )
}

/* ── Advertencias ──────────────────────────────────────────────────────────── */

function Warnings({ doc }: { doc: TransformationDto }) {
  if (doc.warnings.length === 0) return null
  return (
    <Card style={{ padding: '12px 16px', background: 'var(--warn-bg)',
                   borderColor: 'color-mix(in srgb, var(--warn) 32%, transparent)' }}>
      {doc.warnings.map(w => (
        <div key={w.code + w.message}
             style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.55,
                      color: 'var(--warn)', padding: '3px 0' }}>
          <span style={{ flex: 'none' }}>⚠️</span>
          <span>{w.message}</span>
        </div>
      ))}
    </Card>
  )
}

/* ── Tablas de renglones ───────────────────────────────────────────────────── */

function LineSection({ doc, side, title, hint, editable, onChanged }: {
  doc: TransformationDto
  side: TransformationSide
  title: string
  hint: string
  editable: boolean
  onChanged: () => void
}) {
  const lines = side === 'CONSUMED' ? doc.consumed : doc.obtained
  const [adding, setAdding] = useState(false)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px 12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          {/* El rótulo es la parte importante: dice qué le pasa al inventario */}
          <span style={side === 'CONSUMED' ? outTag : inTag}>{hint}</span>
        </div>
        {editable && !adding && (
          <GhostBtn onClick={() => setAdding(true)}>
            + Agregar {side === 'CONSUMED' ? 'consumido' : 'obtenido'}
          </GhostBtn>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Producto</th>
            <th style={thStyle}>Código</th>
            <th style={thStyle}>Unidad</th>
            <th style={thStyle}>Cantidad</th>
            {side === 'CONSUMED' ? (
              <>
                <th style={thStyle}>Costo unitario</th>
                <th style={thStyle}>Costo total</th>
              </>
            ) : (
              <>
                <th style={thStyle}>Precio referencia</th>
                <th style={thStyle}>Valor de venta</th>
                <th style={thStyle}>Participación</th>
                <th style={thStyle}>Costo asignado</th>
                <th style={thStyle}>Costo unitario</th>
              </>
            )}
            {editable && <th style={thStyle}></th>}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr><td style={{ ...tdStyle, color: 'var(--muted)', textAlign: 'center', padding: '22px 14px' }} colSpan={11}>
              Sin renglones todavía
            </td></tr>
          )}
          {lines.map(l => (
            <LineRow key={l.id} doc={doc} line={l} side={side}
                     editable={editable} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
      </div>

      {adding && (
        <AddLineForm doc={doc} side={side}
                     onClose={() => setAdding(false)} onChanged={onChanged} />
      )}
    </Card>
  )
}

function LineRow({ doc, line, side, editable, onChanged }: {
  doc: TransformationDto
  line: TransformationLineDto
  side: TransformationSide
  editable: boolean
  onChanged: () => void
}) {
  const removeMut = useMutation({
    mutationFn: () => transformationApi.removeLine(doc.id, line.id),
    onSuccess: onChanged,
  })
  const esMerma = line.lineKind === 'WASTE'

  return (
    <tr style={esMerma ? { opacity: 0.75 } : undefined}>
      <td style={tdStyle}>
        {line.productName}
        {esMerma && <span style={wasteTag}>MERMA</span>}
      </td>
      <td style={tdStyle}>{line.productCode ?? '—'}</td>
      <td style={tdStyle}>{line.unit}</td>
      <td style={tdStyle}>{line.quantity}</td>
      {side === 'CONSUMED' ? (
        <>
          <td style={tdStyle}>{line.unitCost != null ? formatCOP(line.unitCost) : sinCostear}</td>
          <td style={tdStyle}>{line.totalCost != null ? formatCOP(line.totalCost) : sinCostear}</td>
        </>
      ) : (
        <>
          <td style={tdStyle}>{line.referenceSalePrice != null ? formatCOP(line.referenceSalePrice) : '—'}</td>
          <td style={tdStyle}>{line.saleValue != null ? formatCOP(line.saleValue) : '—'}</td>
          <td style={tdStyle}>
            {line.allocationWeight != null ? `${(line.allocationWeight * 100).toFixed(1)}%` : '—'}
          </td>
          <td style={tdStyle}>
            {esMerma ? <span style={{ color: 'var(--muted)' }}>no recibe costo</span>
              : line.allocatedCost != null ? formatCOP(line.allocatedCost) : sinCostear}
          </td>
          <td style={tdStyle}>
            {line.resultingUnitCost != null ? formatCOP(line.resultingUnitCost) : esMerma ? '—' : sinCostear}
          </td>
        </>
      )}
      {editable && (
        <td style={tdStyle}>
          <button style={linkBtn} onClick={() => removeMut.mutate()}>quitar</button>
        </td>
      )}
    </tr>
  )
}

function AddLineForm({ doc, side, onClose, onChanged }: {
  doc: TransformationDto
  side: TransformationSide
  onClose: () => void
  onChanged: () => void
}) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [esMerma, setEsMerma] = useState(false)

  const { data: page } = useQuery({
    queryKey: ['products', 'for-transformation'],
    queryFn: () => productApi.listAll(0, 500),
  })
  const { data: stockPage } = useQuery({
    queryKey: ['inventory-stock', 'for-transformation'],
    queryFn: () => inventoryApi.listStock(0, 500),
  })

  const stockPorProducto = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of stockPage?.content ?? []) m[s.productId] = s.currentStock
    return m
  }, [stockPage])

  /*
   * Cada lado ofrece solo lo que corresponde:
   *
   *   CONSUMIDO   productos marcados como transformables Y con existencia.
   *               Sin existencia no hay nada que procesar.
   *   OBTENIDO    productos marcados como obtenibles. NO se filtra por
   *               existencia: el producto terminado todavía no existe, y
   *               exigirle stock impediría producirlo por primera vez.
   *
   * Las marcas se declaran en la ficha del producto. Sin ellas el selector
   * ofrecía los 34 del catálogo, incluidos el agua de coco y el achiote.
   */
  const products = useMemo(() => {
    const todos = page?.content ?? []
    return side === 'CONSUMED'
      ? todos.filter(p => p.transformationInputEnabled && (stockPorProducto[p.id] ?? 0) > 0)
      : todos.filter(p => p.transformationOutputEnabled)
  }, [page, side, stockPorProducto])

  const stockActual = productId ? stockPorProducto[productId] ?? null : null

  const addMut = useMutation({
    mutationFn: () => transformationApi.addLine(doc.id, {
      side,
      lineKind: esMerma ? 'WASTE' : 'PRODUCT',
      productId,
      quantity: parseFloat(quantity),
    }),
    onSuccess: () => { onChanged(); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudo agregar el renglón', 'error')
    },
  })

  const sinOpciones = products.length === 0
  const habilitados = (page?.content ?? []).filter(p =>
    side === 'CONSUMED' ? p.transformationInputEnabled : p.transformationOutputEnabled).length
  const cantidad = parseFloat(quantity)
  const valido = productId !== '' && cantidad > 0
  const resultante = stockActual != null && cantidad > 0 && side === 'CONSUMED'
    ? stockActual - cantidad : null

  return (
    <div style={{ padding: '14px 18px 18px', borderTop: '1px solid var(--line)',
                  background: 'var(--bg)' }}>
      {/* Rejilla de anchos fijos: con flex, los campos se estiraban hasta los
          extremos de la pantalla y el formulario quedaba desperdigado. */}
      <div style={formGrid}>
        <label>
          <span style={labelSm}>Producto</span>
          <Select
            style={{ width: '100%' }}
            value={productId}
            onChange={setProductId}
            options={[
              { value: '', label: sinOpciones ? 'Sin productos disponibles' : 'Seleccionar…' },
              ...products.map(p => ({
                value: p.id,
                label: side === 'CONSUMED'
                  ? `${p.sku ? p.sku + ' · ' : ''}${p.name} — ${stockPorProducto[p.id] ?? 0}`
                  : `${p.sku ? p.sku + ' · ' : ''}${p.name}`,
              })),
            ]}
          />
        </label>

        <label>
          <span style={labelSm}>Cantidad</span>
          <input style={inputStyle} type="number" min="0" step="0.001" placeholder="0"
                 value={quantity} onChange={e => setQuantity(e.target.value)} />
        </label>

        {side === 'OBTAINED' ? (
          <label style={checkRow}>
            <input type="checkbox" checked={esMerma} onChange={e => setEsMerma(e.target.checked)} />
            <span>Es merma</span>
          </label>
        ) : <span />}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn disabled={!valido} loading={addMut.isPending}
                      onClick={() => addMut.mutate()}>
            Agregar
          </PrimaryBtn>
        </div>
      </div>

      <div style={hintRow}>
        {sinOpciones ? (
          <span style={{ color: 'var(--warn)' }}>
            {habilitados === 0
              ? side === 'CONSUMED'
                ? 'Ningún producto está marcado como transformable. Actívalo en la ficha del producto, en Inventario.'
                : 'Ningún producto está marcado como obtenible de una transformación. Actívalo en la ficha del producto, en Inventario.'
              : 'Los productos transformables no tienen existencia: registra una entrada de inventario primero.'}
          </span>
        ) : side === 'CONSUMED' ? (
          stockActual != null ? (
            <>
              Existencia actual <b style={{ color: 'var(--text)' }}>{stockActual}</b>
              {resultante != null && (
                <>
                  {'  →  resultante '}
                  <b style={{ color: resultante < 0 ? 'var(--neg)' : 'var(--text)' }}>{resultante}</b>
                  {resultante < 0 && <span style={{ color: 'var(--warn)' }}> · quedará negativa, se permite</span>}
                </>
              )}
            </>
          ) : (
            'Elige un producto para ver su existencia'
          )
        ) : null}
      </div>
    </div>
  )
}

/* ── Piezas pequeñas ───────────────────────────────────────────────────────── */

const sinCostear = <span style={{ color: 'var(--warn, #b8860b)', fontSize: 12 }}>Sin costear</span>

function YieldLabel({ doc }: { doc: TransformationDto }) {
  if (!doc.yieldCalculable || doc.yieldPercentage == null) {
    return <span style={{ color: 'var(--muted)', fontSize: 13 }}>No calculable</span>
  }
  const v = doc.yieldPercentage
  return <span style={{ color: v > 100 ? 'var(--warn, #b8860b)' : 'inherit' }}>{pct(v)}%</span>
}

function CostLabel({ doc }: { doc: TransformationDto }) {
  // Nunca mostrar $0 como si fuera un costo real
  if (doc.costingStatus === 'UNCOSTED') return sinCostear
  if (doc.inputTotalCost == null) return <span style={{ color: 'var(--muted)' }}>—</span>
  return <>{formatCOP(doc.inputTotalCost)}</>
}

/** Usa el chip del sistema: mismos colores que facturas y pedidos. */
function StatusBadge({ status }: { status: TransformationDto['status'] }) {
  const map = {
    DRAFT:     { estado: 'pending',   label: 'Borrador' },
    CONFIRMED: { estado: 'confirmed', label: 'Confirmada' },
    CANCELLED: { estado: 'neg',       label: 'Anulada' },
  }[status]
  return <StatusChip status={map.estado} label={map.label} />
}

function pct(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')
}

/** Suma en unidad base; null si alguna línea no es convertible. */
function sumBase(lines: TransformationLineDto[]): number | null {
  let total = 0
  for (const l of lines) {
    if (l.baseQuantity == null) return null
    total += l.baseQuantity
  }
  return Math.round(total * 1000) / 1000
}

/* ── Estilos ───────────────────────────────────────────────────────────────
   Solo lo que el kit compartido no cubre. Botones, tarjetas y chips salen de
   shared/helpers para que esta pantalla envejezca con el resto del sistema. */

const pageStyle: React.CSSProperties = {
  padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20,
  animation: 'fadeUp 0.25s ease',
}
const rowStyle: React.CSSProperties = { cursor: 'pointer' }
const numTd: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const emptyText: React.CSSProperties = { padding: '28px 18px', color: 'var(--muted)', fontSize: 13 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
}
/* Anchos propios para que el formulario no se estire de extremo a extremo */
const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 420px) 120px auto 1fr',
  gap: 12,
  alignItems: 'end',
}
const checkRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, height: 36,
  fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap',
}
const hintRow: React.CSSProperties = {
  marginTop: 10, fontSize: 12.5, color: 'var(--muted)',
}
const labelSm: React.CSSProperties = {
  display: 'block', fontSize: 11.5, color: 'var(--muted)', marginBottom: 5, fontWeight: 500,
}
const linkBtn: React.CSSProperties = {
  background: 'none', border: 0, color: 'var(--neg)', cursor: 'pointer',
  fontSize: 12.5, fontFamily: 'inherit', padding: 0,
}
/* Los rótulos de dirección: la señal más rápida de qué le pasa al inventario. */
const outTag: React.CSSProperties = {
  padding: '2px 9px', borderRadius: 100, fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em',
  background: 'var(--neg-bg)', color: 'var(--neg)',
}
const inTag: React.CSSProperties = { ...outTag, background: 'var(--pos-bg)', color: 'var(--pos)' }
const wasteTag: React.CSSProperties = {
  marginLeft: 8, padding: '1px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700,
  background: 'var(--bg)', color: 'var(--muted)',
}
