import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, Tile, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { productApi, categoryApi, productImageSrc } from '../catalog/api/productApi'
import { inventoryApi } from './api/inventoryApi'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'
import type { StockStatus, ProductType, ProductStatus } from '../../shared/types'
import type { ProductDto } from '../catalog/api/productApi'

const PAGE_SIZE = 12

function tileColorForName(name: string) {
  const colors = ['teal', 'blue', 'orange', 'purple', 'red', 'green']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function stockStatusToChipStatus(s: StockStatus): string {
  if (s === 'OK') return 'ok'
  if (s === 'LOW') return 'low'
  return 'critical'
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  CONSUMER_GOOD: 'Consumo',
  RAW_MATERIAL: 'Materia prima',
  INTERNAL_SUPPLY: 'Uso interno',
  SERVICE_ASSOCIATED: 'Servicio',
}

const UNIT_LABELS: Record<string, string> = {
  KG: 'Kilogramo', LB: 'Libra', UNIT: 'Unidad', PACKAGE: 'Paquete', LITER: 'Litro',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', ACTIVE: 'Activo', INACTIVE: 'Inactivo',
}

// ── Excel import types ──────────────────────────────────────────────────────

interface ExcelRow {
  Nombre?: string
  SKU?: string
  'Código de barras'?: string
  Categoría?: string
  'Tipo de unidad'?: string
  'Tipo de producto'?: string
  'Costo de compra'?: number | string
  'Precio de venta'?: number | string
  Descripción?: string
  [key: string]: unknown
}

// ── Confirm Dialog (reusable within this module) ───────────────────────────

function ConfirmDialog({ title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', icon, iconBg, onConfirm, onCancel }: {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  icon?: string
  iconBg?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const btnColor = variant === 'danger'
    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
    : 'linear-gradient(135deg,#3b82f6,#2563eb)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--surface)', borderRadius: 16,
          padding: '28px 28px 24px', width: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          animation: 'dialogPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        {icon && (
          <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg ?? 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
            {icon}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 22 }}>{description}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: btnColor, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Product Detail Modal ────────────────────────────────────────────────────

function ProductDetailModal({ product, currentStock, onClose, onDeleted }: {
  product: ProductDto
  currentStock: number
  onClose: () => void
  onDeleted: () => void
}) {
  const qc = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState<'info' | 'lots' | 'movements'>('info')
  const [dialog, setDialog] = useState<{ title: string; description: string; confirmLabel: string; variant: 'danger' | 'primary'; icon?: string; iconBg?: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data: movementsPage } = useQuery({
    queryKey: ['movements', product.id],
    queryFn: () => inventoryApi.getMovements(0, 10, product.id),
    enabled: tab === 'movements',
  })

  const { data: lots = [] } = useQuery({
    queryKey: ['lots', product.id],
    queryFn: () => inventoryApi.getLots(product.id),
    enabled: tab === 'lots',
  })

  const movements = movementsPage?.content ?? []

  function handleDelete() {
    setDialog({
      title: 'Eliminar producto',
      description: `¿Estás seguro de que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      icon: '🗑️',
      iconBg: 'rgba(239,68,68,0.12)',
      onConfirm: async () => {
        setDialog(null)
        setDeleting(true)
        try {
          await productApi.delete(product.id)
          qc.invalidateQueries({ queryKey: ['products'] })
          qc.invalidateQueries({ queryKey: ['stock'] })
          onDeleted()
          toast('Producto eliminado', 'info')
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo eliminar'
          toast(msg, 'error')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  })

  const MOVEMENT_LABELS: Record<string, string> = {
    ENTRY: 'Entrada', EXIT: 'Salida', WASTE: 'Merma',
    POSITIVE_ADJUSTMENT: 'Ajuste +', NEGATIVE_ADJUSTMENT: 'Ajuste −',
  }

  return (
    <>
    {dialog && (
      <ConfirmDialog
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirmLabel}
        variant={dialog.variant}
        icon={dialog.icon}
        iconBg={dialog.iconBg}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(null)}
      />
    )}
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
      <div onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560, maxHeight: '88vh',
        background: 'var(--surface)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'overlayIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            {product.imageUrl ? (
              <img src={productImageSrc(product.imageUrl) ?? undefined} alt={product.name}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <Tile initial={product.name.slice(0, 2).toUpperCase()} tile={tileColorForName(product.name)} size={44} />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{product.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{product.sku ? `SKU: ${product.sku}` : 'Sin SKU'}</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
          <button style={tabStyle(tab === 'info')} onClick={() => setTab('info')}>Información</button>
          <button style={tabStyle(tab === 'lots')} onClick={() => setTab('lots')}>Lotes / Precios</button>
          <button style={tabStyle(tab === 'movements')} onClick={() => setTab('movements')}>Movimientos</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Categoría', product.categoryName ?? '—'],
                ['Código de barras', product.barcode ?? '—'],
                ['Tipo de producto', product.productType ? (PRODUCT_TYPE_LABELS[product.productType] ?? product.productType) : '—'],
                ['Tipo de unidad', UNIT_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure],
                ['Último costo de compra', product.purchaseCostLast != null ? formatCOP(product.purchaseCostLast) : '—'],
                ['Costo promedio ponderado', product.averageCost != null ? formatCOP(product.averageCost) : '—'],
                ['Precio de venta', product.salePrice != null ? formatCOP(product.salePrice) : '—'],
                ['Control de inventario', product.inventoryTrackingEnabled ? 'Activado' : 'Desactivado'],
                ['Almacén predeterminado', product.defaultWarehouse ?? '—'],
                ['Estado', STATUS_LABELS[product.status] ?? product.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              {/* Stock */}
              <div style={{
                background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--accent-text)', fontWeight: 600 }}>Stock actual</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-text)' }}>
                  {currentStock.toFixed(3)} {UNIT_LABELS[product.unitOfMeasure]?.split(' ')[0] ?? ''}
                </span>
              </div>
              {/* Dates */}
              <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                <span>Creado: {formatDate(product.createdAt)}</span>
                <span>Actualizado: {formatDate(product.updatedAt)}</span>
              </div>
            </div>
          )}

          {tab === 'lots' && (
            <div>
              {lots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                  No hay lotes registrados aún.<br />
                  <span style={{ fontSize: 12 }}>Se crean automáticamente al recibir una orden de compra.</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, padding: '0 2px' }}>
                    Historial de compras — precio pagado por lote, del más reciente al más antiguo.
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        {['Fecha recepción', 'Precio pagado', 'Cant. recibida', 'Disponible', 'Vence', 'Factura'].map((h) => (
                          <th key={h} style={{ ...thStyle, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((lot) => {
                        const isExpired = lot.expiresAt && new Date(lot.expiresAt) < new Date()
                        const isLow = lot.availableQuantity < lot.originalQuantity * 0.2
                        return (
                          <tr key={lot.id}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(lot.receivedAt)}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent-text)', whiteSpace: 'nowrap' }}>
                              {formatCOP(lot.purchasePrice)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{lot.originalQuantity.toFixed(3)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: isLow ? 'var(--warn)' : 'var(--text)' }}>
                              {lot.availableQuantity.toFixed(3)}
                            </td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: isExpired ? 'var(--neg)' : 'var(--muted)', fontWeight: isExpired ? 700 : 400 }}>
                              {lot.expiresAt ? formatDate(lot.expiresAt) : '—'}
                              {isExpired && <span style={{ marginLeft: 4, fontSize: 10 }}>VENCIDO</span>}
                            </td>
                            <td style={{ ...tdStyle, fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
                              {lot.invoiceNumber ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {tab === 'movements' && (
            <div>
              {movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13 }}>
                  Sin movimientos registrados
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['Tipo', 'Cantidad', 'Costo', 'Notas', 'Fecha'].map((h) => (
                        <th key={h} style={{ ...thStyle, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={tdStyle}>
                          <StatusChip
                            status={m.movementType === 'ENTRY' || m.movementType === 'POSITIVE_ADJUSTMENT' ? 'ok' : 'warn'}
                            label={MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                          />
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{m.quantity.toFixed(3)}</td>
                        <td style={tdStyle}>{m.unitCost != null ? formatCOP(m.unitCost) : '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11.5 }}>{m.notes ?? m.reason ?? '—'}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--neg) 40%, transparent)',
              background: 'color-mix(in srgb, var(--neg) 8%, transparent)',
              color: 'var(--neg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Excel Import Modal ──────────────────────────────────────────────────────

function ExcelImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ExcelRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.listAll })
  const catByName = Object.fromEntries(categories.map((c) => [c.name.toLowerCase(), c.id]))

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrors([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const parsed = XLSX.utils.sheet_to_json<ExcelRow>(sheet)
        setRows(parsed)
        const errs: string[] = []
        parsed.forEach((row, i) => {
          if (!row['Nombre']) errs.push(`Fila ${i + 2}: campo "Nombre" es requerido`)
        })
        setErrors(errs)
      } catch {
        setErrors(['No se pudo leer el archivo. Asegúrate de que sea .xlsx o .xls válido.'])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (errors.length > 0 || rows.length === 0) return
    setImporting(true)
    try {
      const requests = rows
        .filter((r) => r['Nombre'])
        .map((r) => {
          const catName = (r['Categoría'] ?? '') as string
          const unitRaw = ((r['Tipo de unidad'] ?? 'UNIT') as string).toUpperCase()
          const validUnits = ['KG', 'LB', 'UNIT', 'PACKAGE', 'LITER']
          const unit = validUnits.includes(unitRaw) ? unitRaw : 'UNIT'
          return {
            name: String(r['Nombre']),
            categoryId: (catName ? (catByName[catName.toLowerCase()] ?? '') : '') as string,
            unitOfMeasure: unit as 'KG' | 'LB' | 'UNIT' | 'PACKAGE' | 'LITER',
            productType: 'CONSUMER_GOOD' as const,
            defaultWarehouse: 'Bodega principal',
            sku: r['SKU'] ? String(r['SKU']) : null,
            barcode: r['Código de barras'] ? String(r['Código de barras']) : null,
            description: r['Descripción'] ? String(r['Descripción']) : null,
            purchaseCost: r['Costo de compra'] ? parseFloat(String(r['Costo de compra'])) : null,
            salePrice: r['Precio de venta'] ? parseFloat(String(r['Precio de venta'])) : 0,
            status: 'ACTIVE' as const,
          }
        })

      await productApi.importBulk(requests)
      qc.invalidateQueries({ queryKey: ['products'] })
      toast(`${requests.length} productos importados`, 'success')
      onImported()
      onClose()
    } catch {
      toast('Error al importar productos', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <div onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 680, maxHeight: '85vh',
        background: 'var(--surface)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'overlayIn 0.15s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Importar productos desde Excel</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Columnas: Nombre*, SKU, Código de barras, Categoría, Tipo de unidad, Costo de compra, Precio de venta, Descripción
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {rows.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: '40px 24px',
                textAlign: 'center', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 13,
                transition: 'border-color 200ms ease',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Haz clic para seleccionar archivo</div>
              <div style={{ fontSize: 12 }}>Formatos soportados: .xlsx, .xls</div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {rows.length <= 10
                    ? `${rows.length} registros detectados`
                    : `Mostrando 10 de ${rows.length} registros detectados.`}
                </span>
                <button
                  onClick={() => { setRows([]); setErrors([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cambiar archivo
                </button>
              </div>

              {errors.length > 0 && (
                <div style={{ background: 'var(--neg-bg)', border: '1px solid color-mix(in srgb,var(--neg) 30%,transparent)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  {errors.map((e, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--neg)' }}>• {e}</div>)}
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['Nombre', 'SKU', 'Unidad', 'Costo compra', 'Precio venta'].map((h) => (
                        <th key={h} style={{ ...thStyle, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={tdStyle}><b>{String(row['Nombre'] ?? '—')}</b></td>
                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{String(row['SKU'] ?? '—')}</td>
                        <td style={tdStyle}>{String(row['Tipo de unidad'] ?? 'UNIT')}</td>
                        <td style={tdStyle}>{row['Costo de compra'] != null ? formatCOP(parseFloat(String(row['Costo de compra']))) : '—'}</td>
                        <td style={tdStyle}>{row['Precio de venta'] != null ? formatCOP(parseFloat(String(row['Precio de venta']))) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          {rows.length > 0 && errors.length === 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {importing ? 'Importando…' : `Confirmar importación (${rows.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Inventory view ─────────────────────────────────────────────────────

type ProductRow = {
  id: string
  name: string
  categoryName: string | null
  unitOfMeasure: string
  minimumStock: number | null
  currentStock: number
  stockStatus: StockStatus
  sku: string | null
  barcode: string | null
  productType: ProductType | null
  status: ProductStatus
  defaultWarehouse: string | null
}

export function Inventory() {
  const { lang, openDrawer } = useAppStore()
  const t = translations[lang]

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productTypeFilter, setProductTypeFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<{ product: ProductDto; stock: number } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const { data: productsPage, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.listAll(0, 500),
  })

  const { data: stockPage, isLoading: loadingStock } = useQuery({
    queryKey: ['stock'],
    queryFn: () => inventoryApi.listStock(0, 1000),
  })

  const { data: expiringLots = [] } = useQuery({
    queryKey: ['expiring-lots'],
    queryFn: () => inventoryApi.getExpiringLots(3),
  })

  const stockMap = useMemo(() => {
    const map: Record<string, { currentStock: number; stockStatus: StockStatus }> = {}
    stockPage?.content?.forEach((s) => {
      map[s.productId] = { currentStock: s.currentStock, stockStatus: s.stockStatus }
    })
    return map
  }, [stockPage])

  const allProducts = productsPage?.content ?? []

  const categories = useMemo(() => {
    const cats = new Set<string>()
    allProducts.forEach((p) => { if (p.categoryName) cats.add(p.categoryName) })
    return Array.from(cats).sort()
  }, [allProducts])

  const warehouses = useMemo(() => {
    const ws = new Set<string>()
    allProducts.forEach((p) => { if (p.defaultWarehouse) ws.add(p.defaultWarehouse) })
    return Array.from(ws).sort()
  }, [allProducts])

  const allRows: ProductRow[] = useMemo(() => {
    return allProducts.map((p) => {
      const stock = stockMap[p.id]
      return {
        id: p.id,
        name: p.name,
        categoryName: p.categoryName,
        unitOfMeasure: p.unitOfMeasure,
        minimumStock: p.minimumStock,
        currentStock: stock?.currentStock ?? 0,
        stockStatus: stock?.stockStatus ?? 'OUT_OF_STOCK' as StockStatus,
        sku: p.sku,
        barcode: p.barcode,
        productType: p.productType,
        status: p.status,
        defaultWarehouse: p.defaultWarehouse,
      }
    })
  }, [allProducts, stockMap])

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase()
    return allRows.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.barcode?.toLowerCase().includes(q) ?? false)
      const matchCat = catFilter === 'all' || p.categoryName === catFilter
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'ok' && p.stockStatus === 'OK') ||
        (statusFilter === 'low' && p.stockStatus === 'LOW') ||
        (statusFilter === 'critical' && (p.stockStatus === 'CRITICAL' || p.stockStatus === 'OUT_OF_STOCK'))
      const matchType = productTypeFilter === 'all' || p.productType === productTypeFilter
      const matchUnit = unitFilter === 'all' || p.unitOfMeasure === unitFilter
      const matchWarehouse = warehouseFilter === 'all' || p.defaultWarehouse === warehouseFilter
      return matchSearch && matchCat && matchStatus && matchType && matchUnit && matchWarehouse
    })
  }, [allRows, search, catFilter, statusFilter, productTypeFilter, unitFilter, warehouseFilter])

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE)
  const paginatedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Reset to page 0 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setCurrentPage(0)
  }

  const totalProducts = allRows.length
  const lowCount = allRows.filter((p) => p.stockStatus === 'LOW' || p.stockStatus === 'CRITICAL' || p.stockStatus === 'OUT_OF_STOCK').length

  const statusLabelMap: Record<string, string> = {
    ok: t.ss_ok, low: t.ss_low, critical: t.ss_critical,
  }

  const isLoading = loadingProducts || loadingStock

  const catHeaderStyle: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--accent-text)',
    background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))',
    borderBottom: '1px solid var(--border)',
    borderTop: '1px solid var(--border)',
  }

  // Group paginated rows by category
  const groupedRows = useMemo(() => {
    const sorted = [...paginatedRows].sort((a, b) => {
      const ca = a.categoryName ?? '￿'
      const cb = b.categoryName ?? '￿'
      return ca.localeCompare(cb) || a.name.localeCompare(b.name)
    })
    const groups: { category: string; items: ProductRow[] }[] = []
    for (const row of sorted) {
      const cat = row.categoryName ?? '—'
      const last = groups[groups.length - 1]
      if (last && last.category === cat) last.items.push(row)
      else groups.push({ category: cat, items: [row] })
    }
    return groups
  }, [paginatedRows])

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>

      {/* Expiring products banner */}
      {expiringLots.length > 0 && (
        <div style={{
          background: 'var(--neg-bg)', border: '1px solid color-mix(in srgb, var(--neg) 30%, transparent)',
          borderRadius: 12, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neg)' }}>
              {expiringLots.length} lote{expiringLots.length !== 1 ? 's' : ''} próximo{expiringLots.length !== 1 ? 's' : ''} a caducar (en menos de 3 días)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {expiringLots.map((lot) => (
              <div key={lot.id} style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--text-2)', paddingLeft: 24, alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: 180 }}>{lot.productName}</span>
                <span>Vence: <b style={{ color: 'var(--neg)' }}>{formatDate(lot.expiresAt)}</b></span>
                <span>Stock disponible: <b>{lot.availableQuantity.toFixed(3)}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label={t.inv_skus} value={String(totalProducts)} sub="productos activos" />
        <KpiCard label="Categorías" value={String(categories.length)} sub="tipos de producto" />
        <KpiCard label={t.inv_low} value={String(lowCount)} trend={lowCount > 0 ? `${lowCount} ítems` : undefined} trendPositive={false} />
        <KpiCard label="En stock" value={String(totalProducts - lowCount)} sub="en nivel objetivo" />
      </div>

      {/* Table card */}
      <Card>
        <CardHeader title={t.nav_inventory} action={
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostBtn onClick={() => setShowImport(true)} style={{ fontSize: 12, padding: '6px 11px' }}>
              📊 Importar Excel
            </GhostBtn>
            <PrimaryBtn onClick={() => openDrawer('product')}>+ {t.btn_new_product}</PrimaryBtn>
          </div>
        } />

        {/* Filters */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 200,
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.6">
              <circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(0) }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', flex: 1 }}
            />
          </div>
          <FilterSelect value={catFilter} onChange={handleFilterChange(setCatFilter)} options={[
            { value: 'all', label: t.fil_allcat },
            ...categories.map((c) => ({ value: c, label: c })),
          ]} />
          <FilterSelect value={statusFilter} onChange={handleFilterChange(setStatusFilter)} options={[
            { value: 'all', label: t.fil_allstatus },
            { value: 'ok', label: t.ss_ok },
            { value: 'low', label: t.ss_low },
            { value: 'critical', label: t.ss_critical },
          ]} />
          <FilterSelect value={productTypeFilter} onChange={handleFilterChange(setProductTypeFilter)} options={[
            { value: 'all', label: 'Tipo' },
            { value: 'CONSUMER_GOOD', label: 'Consumo' },
            { value: 'RAW_MATERIAL', label: 'Materia prima' },
            { value: 'INTERNAL_SUPPLY', label: 'Uso interno' },
            { value: 'SERVICE_ASSOCIATED', label: 'Servicio' },
          ]} />
          <FilterSelect value={unitFilter} onChange={handleFilterChange(setUnitFilter)} options={[
            { value: 'all', label: 'Unidad' },
            { value: 'KG', label: 'Kilogramo' },
            { value: 'LB', label: 'Libra' },
            { value: 'UNIT', label: 'Unidad' },
            { value: 'PACKAGE', label: 'Paquete' },
            { value: 'LITER', label: 'Litro' },
          ]} />
          {warehouses.length > 0 && (
            <FilterSelect value={warehouseFilter} onChange={handleFilterChange(setWarehouseFilter)} options={[
              { value: 'all', label: 'Almacén' },
              ...warehouses.map((w) => ({ value: w, label: w })),
            ]} />
          )}
          <GhostBtn style={{ fontSize: 12, padding: '6px 11px' }}>{t.btn_export}</GhostBtn>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando inventario…</div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {totalProducts === 0 ? t.no_products : 'Ningún producto coincide con los filtros.'}
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.th_product}</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>{t.th_unit}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_stock}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t.th_min_stock}</th>
                  <th style={thStyle}>{t.th_status}</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group) => {
                  const isCollapsed = collapsedCategories.has(group.category)
                  return (
                  <>
                    <tr key={`hdr-${group.category}`} onClick={() => toggleCategory(group.category)} style={{ cursor: 'pointer' }}>
                      <td colSpan={6} style={catHeaderStyle}>
                        <span style={{
                          display: 'inline-block',
                          marginRight: 6,
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                          transition: 'transform 180ms ease',
                          fontSize: 10,
                        }}>›</span>
                        {group.category}
                        <span style={{ fontWeight: 500, marginLeft: 8, opacity: 0.7 }}>({group.items.length})</span>
                      </td>
                    </tr>
                    {!isCollapsed && group.items.map((p) => {
                      const chipStatus = stockStatusToChipStatus(p.stockStatus)
                      const rowImage = productImageSrc(allProducts.find((ap) => ap.id === p.id)?.imageUrl ?? null)
                      return (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const fullProduct = allProducts.find((ap) => ap.id === p.id)
                            if (fullProduct) setSelectedProduct({ product: fullProduct, stock: p.currentStock })
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              {rowImage ? (
                                <img src={rowImage} alt={p.name}
                                  style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                              ) : (
                                <Tile initial={p.name.slice(0, 2).toUpperCase()} tile={tileColorForName(p.name)} size={28} />
                              )}
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                            {p.sku ?? '—'}
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                            {UNIT_LABELS[p.unitOfMeasure] ?? p.unitOfMeasure}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>
                            {p.currentStock.toFixed(3)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--muted)' }}>
                            {p.minimumStock != null ? p.minimumStock : '—'}
                          </td>
                          <td style={tdStyle}>
                            <StatusChip status={chipStatus} label={statusLabelMap[chipStatus] ?? chipStatus} />
                          </td>
                        </tr>
                      )
                    })}
                  </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Página <b style={{ color: 'var(--text-2)' }}>{currentPage + 1}</b> de {totalPages} ·{' '}
              <b style={{ color: 'var(--text-2)' }}>{filteredRows.length}</b> productos
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: currentPage === 0 ? 'var(--faint)' : 'var(--text-2)',
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer', fontSize: 12.5, fontFamily: 'inherit',
                }}
              >← Anterior</button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: currentPage >= totalPages - 1 ? 'var(--faint)' : 'var(--text-2)',
                  cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 12.5, fontFamily: 'inherit',
                }}
              >Siguiente →</button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isLoading && filteredRows.length > 0 && totalPages <= 1 && (
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {t.showing} <b style={{ color: 'var(--text-2)' }}>{filteredRows.length}</b> {t.of} {totalProducts}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {groupedRows.length} {groupedRows.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>
        )}
      </Card>

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct.product}
          currentStock={selectedProduct.stock}
          onClose={() => setSelectedProduct(null)}
          onDeleted={() => setSelectedProduct(null)}
        />
      )}

      {/* Excel import modal */}
      {showImport && (
        <ExcelImportModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
