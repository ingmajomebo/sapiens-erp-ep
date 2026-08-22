import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import {
  Card, KpiCard, CardHeader, Tile, StatusChip,
  PrimaryBtn, GhostBtn, FilterSelect, Select,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { productApi, categoryApi, subcategoryApi, productImageSrc } from '../catalog/api/productApi'
import { inventoryApi } from './api/inventoryApi'
import { warehouseApi } from './api/warehouseApi'
import { storageLocationApi } from './api/storageLocationApi'
import { formatCOP, formatQty } from '../../shared/currency'
import { toast } from '../../shared/toast'
import type { StockStatus, ProductType, ProductStatus, UnitOfMeasure } from '../../shared/types'
import type { ProductDto } from '../catalog/api/productApi'
import type { WarehouseStockDto } from './api/inventoryApi'

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

type ChangeItem = { field: string; from: string; to: string }

function ConfirmDialog({ title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', icon, iconBg, changes, onConfirm, onCancel }: {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  icon?: string
  iconBg?: string
  changes?: ChangeItem[]
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirming) onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, confirming])

  async function handleConfirm() {
    if (confirming) return
    setConfirming(true)
    try {
      await onConfirm()
    } catch {
      // onConfirm handles errors internally
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => { if (!confirming) onCancel() }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--surface)', borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '24px 24px 20px',
          width: changes?.length ? 420 : 360,
          maxWidth: '90vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          animation: 'dialogPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        {icon && (
          <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg ?? 'color-mix(in srgb, var(--neg) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
            {icon}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: changes?.length ? 14 : 20 }}>{description}</div>

        {/* Lista de cambios */}
        {changes && changes.length > 0 && (
          <div style={{ marginBottom: 20, borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', fontSize: 12.5 }}>
            <div style={{ background: 'var(--surface-2)', padding: '6px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
              Cambios a guardar
            </div>
            {changes.map(({ field, from, to }, i) => (
              <div key={field} style={{ padding: '8px 12px', borderBottom: i < changes.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: 11.5, marginBottom: 3 }}>{field}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--muted)', textDecoration: 'line-through', fontSize: 12 }}>{from || '—'}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>→</span>
                  <span style={{ color: 'var(--accent-text)', fontWeight: 700, fontSize: 12 }}>{to || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onCancel} disabled={confirming}>{cancelLabel}</GhostBtn>
          <Button variant={variant} size="sm" loading={confirming} onClick={handleConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

// ── Transfer Modal ─────────────────────────────────────────────────────────

function TransferModal({ product, warehouseStocks, fromWarehouseId, onClose }: {
  product: ProductDto
  warehouseStocks: WarehouseStockDto[]
  fromWarehouseId?: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [fromLocationId, setFromLocationId] = useState(fromWarehouseId ?? '')
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: locations = [] } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: storageLocationApi.listAll,
  })

  const activeLocations = locations.filter(l => l.active)

  // Available stock at selected fromLocation — from movement-based warehouseStocks (correct)
  const availableAtFrom = useMemo(() => {
    if (!fromLocationId) return null
    return warehouseStocks.find(ws => ws.warehouseId === fromLocationId)?.stock ?? 0
  }, [warehouseStocks, fromLocationId])

  const transferMut = useMutation({
    mutationFn: () => inventoryApi.createTransfer({
      productId: product.id,
      fromLocationId,
      toLocationId,
      quantity: parseFloat(quantity),
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['lots', product.id] })
      qc.invalidateQueries({ queryKey: ['movements', product.id] })
      toast('Transferencia registrada', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al registrar transferencia'
      setError(msg)
    },
  })

  function handleSubmit() {
    setError(null)
    if (!fromLocationId) { setError('Selecciona la ubicación de origen'); return }
    if (!toLocationId)   { setError('Selecciona la ubicación de destino'); return }
    if (fromLocationId === toLocationId) { setError('El origen y destino deben ser diferentes'); return }
    const qty = parseFloat(quantity)
    if (!quantity || isNaN(qty) || qty <= 0) { setError('Ingresa una cantidad válida'); return }
    if (availableAtFrom !== null && qty > availableAtFrom) {
      setError(`Stock disponible en origen: ${formatQty(availableAtFrom, 3, true)}`); return
    }
    transferMut.mutate()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block',
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !transferMut.isPending) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, transferMut.isPending])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9800 }}
      onClick={() => { if (!transferMut.isPending) onClose() }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 440, background: 'var(--surface)',
        borderRadius: 14, border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        animation: 'fadeUp 0.18s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Transferir stock</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{product.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* From → To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={lbl}>Desde</label>
              <Select
                style={{ width: '100%' }}
                value={fromLocationId}
                onChange={setFromLocationId}
                options={[
                  { value: '', label: 'Seleccionar origen…' },
                  ...activeLocations.map(l => ({ value: l.id, label: l.name })),
                ]}
              />
              {fromLocationId && availableAtFrom !== null && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  Disponible: <b>{formatQty(availableAtFrom, 3, true)}</b>
                </div>
              )}
            </div>
            <div style={{ fontSize: 18, color: 'var(--muted)', paddingBottom: 8 }}>→</div>
            <div>
              <label style={lbl}>Hasta</label>
              <Select
                style={{ width: '100%' }}
                value={toLocationId}
                onChange={setToLocationId}
                options={[
                  { value: '', label: 'Seleccionar destino…' },
                  ...activeLocations
                    .filter(l => l.id !== fromLocationId)
                    .map(l => ({ value: l.id, label: l.name })),
                ]}
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label style={lbl}>Cantidad *</label>
            <input
              style={inp}
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0.000"
            />
          </div>

          {/* Reason */}
          <div>
            <label style={lbl}>Motivo</label>
            <input style={inp} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="ej. Reorganización de almacén" />
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notas</label>
            <input style={inp} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Información adicional (opcional)" />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--neg)', background: 'var(--neg-bg)', borderRadius: 6, padding: '6px 10px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={transferMut.isPending}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={transferMut.isPending}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: transferMut.isPending ? 0.7 : 1 }}>
            {transferMut.isPending ? 'Transfiriendo…' : 'Confirmar transferencia'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lots Tab ──────────────────────────────────────────────────────────────────

import type { LotDto } from './api/inventoryApi'

function LotsTab({ lots, product }: {
  lots: LotDto[]
  product: ProductDto
}) {
  const qc = useQueryClient()
  const [assigningLotId, setAssigningLotId] = useState<string | null>(null)
  const [assignTargetId, setAssignTargetId] = useState('')
  const [assignReason, setAssignReason] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)

  const { data: locations = [] } = useQuery({
    queryKey: ['storage-locations'],
    queryFn: storageLocationApi.listAll,
  })

  const assignMutation = useMutation({
    mutationFn: ({ lotId, targetId, reason }: { lotId: string; targetId: string; reason: string }) =>
      inventoryApi.assignLotLocation(lotId, targetId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lots', product.id] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      setAssigningLotId(null)
      setAssignTargetId('')
      setAssignReason('')
      setAssignError(null)
      toast('Ubicación asignada correctamente', 'success')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAssignError(msg ?? 'Error al asignar la ubicación')
    },
  })

  function handleAssign(lotId: string) {
    setAssignError(null)
    if (!assignTargetId) { setAssignError('Selecciona un almacén'); return }
    if (!assignReason.trim()) { setAssignError('El motivo es obligatorio'); return }
    assignMutation.mutate({ lotId, targetId: assignTargetId, reason: assignReason.trim() })
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12.5,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  if (lots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
        No hay lotes registrados aún.<br />
        <span style={{ fontSize: 12 }}>Se crean automáticamente al recibir una orden de compra.</span>
      </div>
    )
  }

  const hasUnlocated = lots.some(l => !l.warehouseId && l.availableQuantity > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', padding: '0 2px' }}>
        Historial de compras — precio pagado por lote, del más reciente al más antiguo.
      </div>

      {hasUnlocated && (
        <div style={{
          background: 'color-mix(in srgb, var(--warn) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--warn)',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <span>Hay lotes sin almacén asignado. Usa <b>Corregir</b> para ubicarlos.</span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Fecha recepción', 'OC / Factura', 'Almacén', 'Precio unit.', 'Recibido', 'Disponible', 'Vence'].map(h => (
                <th key={h} style={{ ...thStyle, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const isExpired = !!lot.expiresAt && new Date(lot.expiresAt) < new Date()
              const isLow = lot.availableQuantity > 0 && lot.availableQuantity < lot.originalQuantity * 0.2
              const isAssigning = assigningLotId === lot.id

              return (
                <React.Fragment key={lot.id}>
                  <tr
                    onMouseEnter={(e) => { if (!isAssigning) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { if (!isAssigning) e.currentTarget.style.background = 'transparent' }}
                    style={{ background: isAssigning ? 'var(--surface-2)' : undefined }}
                  >
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(lot.receivedAt)}</td>
                    <td style={{ ...tdStyle, fontSize: 11, fontFamily: 'monospace', color: 'var(--accent-text)', fontWeight: 600 }}>
                      {lot.invoiceNumber ?? '—'}
                    </td>
                    <td style={tdStyle}>
                      {lot.warehouseId ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'var(--accent-weak)', color: 'var(--accent-text)',
                          borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 600,
                        }}>
                          📦 {lot.warehouseName}
                        </span>
                      ) : lot.availableQuantity > 0 ? (
                        <button
                          onClick={() => {
                            setAssigningLotId(isAssigning ? null : lot.id)
                            setAssignTargetId('')
                            setAssignReason('')
                            setAssignError(null)
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
                            color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          ⚠️ Sin ubicación · Corregir
                        </button>
                      ) : (
                        <span style={{ color: 'var(--faint)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatCOP(lot.purchasePrice)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatQty(lot.originalQuantity, 3, true)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: isLow ? 'var(--warn)' : 'var(--text)', fontWeight: isLow ? 700 : 400 }}>
                      {formatQty(lot.availableQuantity, 3, true)}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: isExpired ? 'var(--neg)' : 'var(--muted)', fontWeight: isExpired ? 700 : 400 }}>
                      {lot.expiresAt ? formatDate(lot.expiresAt) : '—'}
                      {isExpired && <span style={{ marginLeft: 4, fontSize: 10 }}>VENCIDO</span>}
                    </td>
                  </tr>

                  {/* Fila inline de corrección de ubicación */}
                  {isAssigning && (
                    <tr>
                      <td colSpan={7} style={{ padding: '0 0 8px 0' }}>
                        <div style={{
                          margin: '4px 0', padding: '12px 14px',
                          background: 'color-mix(in srgb, var(--warn) 6%, var(--surface-2))',
                          border: '1px solid color-mix(in srgb, var(--warn) 25%, transparent)',
                          borderRadius: 8,
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                            Asignar almacén al lote <span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{lot.invoiceNumber}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                                Almacén destino *
                              </div>
                              <select style={inputStyle} value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)}>
                                <option value="">Seleccionar almacén...</option>
                                {locations.filter(l => l.active).map(l => (
                                  <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' (predeterminado)' : ''}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                                Motivo de corrección *
                              </div>
                              <input
                                style={inputStyle}
                                placeholder="Ej: OC recibida sin almacén asignado"
                                value={assignReason}
                                onChange={e => setAssignReason(e.target.value)}
                              />
                            </div>
                          </div>
                          {assignError && (
                            <div style={{ fontSize: 11.5, color: 'var(--neg)', marginBottom: 8 }}>{assignError}</div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="primary" size="sm"
                              loading={assignMutation.isPending}
                              onClick={() => handleAssign(lot.id)}
                            >
                              Guardar ubicación
                            </Button>
                            <GhostBtn onClick={() => setAssigningLotId(null)}>Cancelar</GhostBtn>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Product Modal (form + lotes + movimientos) ──────────────────────────────

function ProductDetailPage({ product, currentStock, stockStatus, warehouseStocks, onClose, onDeleted, onUpdated }: {
  product: ProductDto
  currentStock: number
  stockStatus: StockStatus
  warehouseStocks: WarehouseStockDto[]
  onClose: () => void
  onDeleted: () => void
  onUpdated?: (p: ProductDto) => void
}) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'edit' | 'lots' | 'movements'>('edit')
  const [showTransfer, setShowTransfer] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; description: string; confirmLabel: string; cancelLabel?: string; variant: 'danger' | 'primary'; icon?: string; iconBg?: string; changes?: ChangeItem[]; onConfirm: () => Promise<void> } | null>(null)

  // Form state — pre-filled from product
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '')
  const [subcategoryId, setSubcategoryId] = useState(product.subcategoryId ?? '')
  const [sku, setSku] = useState(product.sku ?? '')
  const [barcode, setBarcode] = useState(product.barcode ?? '')
  const [productType, setProductType] = useState<ProductType>(product.productType ?? 'CONSUMER_GOOD')
  const [status, setStatus] = useState<ProductStatus>(product.status)
  const [salePrice, setSalePrice] = useState(product.salePrice != null ? String(product.salePrice) : '')
  const [minimumStock, setMinimumStock] = useState(product.minimumStock != null ? String(product.minimumStock) : '0')
  const [inventoryTracking, setInventoryTracking] = useState(product.inventoryTrackingEnabled)
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>(product.unitOfMeasure)
  const [warehouseId, setWarehouseId] = useState(product.warehouseId ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.listAll })
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => subcategoryApi.listAll(categoryId),
    enabled: !!categoryId,
  })
  const { data: warehouseList = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.listAll })

  // Detectar qué campos cambiaron vs el producto original
  const changes = useMemo<ChangeItem[]>(() => {
    const list: ChangeItem[] = []
    if (name.trim() !== product.name)
      list.push({ field: 'Nombre', from: product.name, to: name.trim() })
    if (categoryId !== (product.categoryId ?? '')) {
      const fromCat = product.categoryName ?? '—'
      const toCat = categories.find(c => c.id === categoryId)?.name ?? '—'
      list.push({ field: 'Categoría', from: fromCat, to: toCat })
    }
    if (subcategoryId !== (product.subcategoryId ?? '')) {
      const fromSub = product.subcategoryName ?? '—'
      const toSub = subcategories.find(sc => sc.id === subcategoryId)?.name ?? '—'
      list.push({ field: 'Subcategoría', from: fromSub, to: toSub })
    }
    if (productType !== (product.productType ?? 'CONSUMER_GOOD'))
      list.push({ field: 'Tipo de producto', from: PRODUCT_TYPE_LABELS[product.productType ?? 'CONSUMER_GOOD'] ?? '—', to: PRODUCT_TYPE_LABELS[productType] ?? productType })
    if (status !== product.status)
      list.push({ field: 'Estado', from: STATUS_LABELS[product.status] ?? product.status, to: STATUS_LABELS[status] ?? status })
    const origPrice = product.salePrice ?? 0
    const newPrice = salePrice !== '' ? parseFloat(salePrice) : 0
    if (Math.abs(newPrice - origPrice) > 0.001)
      list.push({ field: 'Precio de venta', from: formatCOP(origPrice), to: formatCOP(newPrice) })
    const origMin = product.minimumStock ?? 0
    const newMin = minimumStock !== '' ? parseFloat(minimumStock) : 0
    if (Math.abs(newMin - origMin) > 0.001)
      list.push({ field: 'Stock mínimo', from: formatQty(origMin, 3, true), to: formatQty(newMin, 3, true) })
    if (unitOfMeasure !== product.unitOfMeasure)
      list.push({ field: 'Unidad de medida', from: UNIT_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure, to: UNIT_LABELS[unitOfMeasure] ?? unitOfMeasure })
    if (sku.trim() !== (product.sku ?? ''))
      list.push({ field: 'SKU', from: product.sku || '—', to: sku.trim() || '—' })
    if (barcode.trim() !== (product.barcode ?? ''))
      list.push({ field: 'Código de barras', from: product.barcode || '—', to: barcode.trim() || '—' })
    if (description.trim() !== (product.description ?? ''))
      list.push({ field: 'Descripción', from: product.description || '—', to: description.trim() || '—' })
    if (inventoryTracking !== product.inventoryTrackingEnabled)
      list.push({ field: 'Control de inventario', from: product.inventoryTrackingEnabled ? 'Activado' : 'Desactivado', to: inventoryTracking ? 'Activado' : 'Desactivado' })
    if (warehouseId !== (product.warehouseId ?? '')) {
      const fromName = product.warehouseName ?? '—'
      const toName = warehouseList.find(w => w.id === warehouseId)?.name ?? '—'
      list.push({ field: 'Almacén', from: fromName, to: toName })
    }
    return list
  }, [name, description, categoryId, subcategoryId, sku, barcode, productType, status, salePrice, minimumStock, inventoryTracking, unitOfMeasure, warehouseId, product, categories, subcategories, warehouseList])

  const isDirty = changes.length > 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data: movementsPage } = useQuery({
    queryKey: ['movements', product.id],
    queryFn: () => inventoryApi.getMovements(0, 50, product.id),
    enabled: tab === 'movements',
  })

  const { data: lots = [] } = useQuery({
    queryKey: ['lots', product.id],
    queryFn: () => inventoryApi.getLots(product.id),
    enabled: tab === 'lots',
  })

  const movements = movementsPage?.content ?? []

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'block',
  }
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 8, border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  })
  const MOVEMENT_LABELS: Record<string, string> = {
    ENTRY: 'Entrada', EXIT: 'Salida', WASTE: 'Merma',
    POSITIVE_ADJUSTMENT: 'Ajuste +', NEGATIVE_ADJUSTMENT: 'Ajuste −',
    TRANSFER: 'Transferencia',
  }

  const unitLabel = UNIT_LABELS[unitOfMeasure]?.split(' ')[0] ?? unitOfMeasure
  const trackedTotal = warehouseStocks.reduce((sum, ws) => sum + ws.stock, 0)
  const untracked = Math.max(0, currentStock - trackedTotal)

  function handleSaveClick() {
    if (!name.trim()) { setFormError('El nombre es requerido'); setTab('edit'); return }
    if (!categoryId) { setFormError('La categoría es requerida'); setTab('edit'); return }
    setFormError(null)
    setDialog({
      title: 'Confirmar actualización',
      description: `Estos son los cambios que se aplicarán a "${name.trim()}":`,
      confirmLabel: 'Guardar cambios',
      cancelLabel: 'Cancelar',
      variant: 'primary',
      icon: '✏️',
      iconBg: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      changes,
      onConfirm: doSave,
    })
  }

  async function doSave() {
    const updated = await productApi.update(product.id, {
      name: name.trim(),
      categoryId,
      subcategoryId: subcategoryId || null,
      unitOfMeasure,
      productType,
      salePrice: salePrice !== '' ? parseFloat(salePrice) : 0,
      defaultWarehouse: product.defaultWarehouse ?? '',
      warehouseId: warehouseId || null,
      minimumStock: minimumStock !== '' ? parseFloat(minimumStock) : 0,
      description: description.trim() || null,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      inventoryTrackingEnabled: inventoryTracking,
      status,
      imageUrl: product.imageUrl,
    })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['stock'] })
    toast('Producto actualizado', 'success')
    setDialog(null)
    onUpdated?.(updated)
  }

  function handleDeleteClick() {
    setDialog({
      title: 'Eliminar producto',
      description: `¿Estás seguro de que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      icon: '🗑️',
      iconBg: 'color-mix(in srgb, var(--neg) 12%, transparent)',
      onConfirm: doDelete,
    })
  }

  async function doDelete() {
    await productApi.delete(product.id)
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['stock'] })
    setDialog(null)
    onDeleted()
    toast('Producto eliminado', 'info')
  }

  return (
    <>
    {dialog && (
      <ConfirmDialog
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        variant={dialog.variant}
        icon={dialog.icon}
        iconBg={dialog.iconBg}
        changes={dialog.changes}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(null)}
      />
    )}

    {/* ── Page layout ── */}
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', animation: 'fadeUp 0.2s ease' }}>

      {/* Top bar */}
      <div style={{
        padding: '11px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0,
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--muted)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            ← Inventario
          </button>
          <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
          {product.imageUrl ? (
            <img src={productImageSrc(product.imageUrl) ?? undefined} alt={product.name}
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
          ) : (
            <Tile initial={product.name.slice(0, 2).toUpperCase()} tile={tileColorForName(product.name)} size={28} />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </span>
          {product.sku && (
            <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>· SKU {product.sku}</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {currentStock > 0 && (
            <button
              onClick={() => setShowTransfer(true)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              ↔ Transferir
            </button>
          )}
          <Button variant="danger" size="sm" onClick={handleDeleteClick}>Eliminar</Button>
          <PrimaryBtn disabled={!isDirty} onClick={handleSaveClick}>
            {isDirty ? `Guardar cambios (${changes.length})` : 'Sin cambios'}
          </PrimaryBtn>
        </div>
      </div>

      {/* Content — sidebar + main */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '272px 1fr', overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflowY: 'auto', padding: '20px 16px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            {product.imageUrl ? (
              <img src={productImageSrc(product.imageUrl) ?? undefined} alt={product.name}
                style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <Tile initial={product.name.slice(0, 2).toUpperCase()} tile={tileColorForName(product.name)} size={72} />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{product.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {product.categoryName ?? '—'}{product.subcategoryName ? ` › ${product.subcategoryName}` : ''} · {UNIT_LABELS[unitOfMeasure] ?? unitOfMeasure}
              </div>
            </div>
          </div>

          {/* Stock card */}
          <div style={{
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-text)' }}>
                {formatQty(currentStock, 3, true)} <span style={{ fontSize: 13 }}>{unitLabel}</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {warehouseStocks.map(ws => (
                <div key={ws.warehouseId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 7,
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>📦</span><span>{ws.warehouseName}</span>
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-text)' }}>
                    {formatQty(ws.stock, 3, true)} {unitLabel}
                  </span>
                </div>
              ))}
              {untracked > 0.001 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 7,
                  background: 'color-mix(in srgb, var(--muted) 10%, transparent)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>⚠️</span><span>Sin ubicación</span>
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
                    {formatQty(untracked, 3, true)} {unitLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Costs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Costos
            </div>
            {[
              ['Costo promedio', product.averageCost != null ? formatCOP(product.averageCost) : '—'],
              ['Último costo', product.purchaseCostLast != null ? formatCOP(product.purchaseCostLast) : '—'],
              ['Precio de venta', product.salePrice != null ? formatCOP(product.salePrice) : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Status + type chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <StatusChip
              status={stockStatusToChipStatus(stockStatus)}
              label={STATUS_LABELS[product.status] ?? product.status}
            />
            <span style={{
              padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)',
            }}>
              {PRODUCT_TYPE_LABELS[product.productType ?? 'CONSUMER_GOOD'] ?? product.productType}
            </span>
          </div>
        </div>

        {/* ── Right: tabs + content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            padding: '10px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 4, background: 'var(--surface)', flexShrink: 0,
          }}>
            <button style={tabStyle(tab === 'edit')} onClick={() => setTab('edit')}>Editar</button>
            <button style={tabStyle(tab === 'lots')} onClick={() => setTab('lots')}>Lotes / Precios</button>
            <button style={tabStyle(tab === 'movements')} onClick={() => setTab('movements')}>Movimientos</button>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

            {/* ── Tab Editar ── */}
            {tab === 'edit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
                {formError && (
                  <div style={{ background: 'var(--neg-bg)', border: '1px solid color-mix(in srgb,var(--neg) 30%,transparent)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--neg)' }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Nombre *</label>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Categoría *</label>
                  <Select
                    style={{ width: '100%' }}
                    value={categoryId}
                    onChange={(v) => {
                      setCategoryId(v)
                      // La subcategoría cuelga de la categoría: al cambiarla deja de ser válida
                      setSubcategoryId('')
                    }}
                    options={[
                      { value: '', label: 'Seleccionar categoría…' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Subcategoría</label>
                  <Select
                    style={{ width: '100%' }}
                    value={subcategoryId}
                    disabled={!categoryId}
                    onChange={(v) => setSubcategoryId(v)}
                    options={[
                      {
                        value: '',
                        label: categoryId ? 'Sin subcategoría (opcional)' : 'Elige una categoría primero',
                      },
                      ...subcategories.map((sc) => ({ value: sc.id, label: sc.name })),
                    ]}
                  />
                  {categoryId && subcategories.length === 0 && (
                    <span style={{ marginTop: 4, fontSize: 11.5, color: 'var(--muted)' }}>
                      Esta categoría aún no tiene subcategorías. Puedes crearlas desde el formulario de nuevo producto.
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Tipo de producto</label>
                    <Select
                      style={{ width: '100%' }}
                      value={productType}
                      onChange={(v) => setProductType(v as ProductType)}
                      options={Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Estado</label>
                    <Select
                      style={{ width: '100%' }}
                      value={status}
                      onChange={(v) => setStatus(v as ProductStatus)}
                      options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Almacén de almacenamiento</label>
                  <Select
                    style={{ width: '100%' }}
                    value={warehouseId}
                    onChange={setWarehouseId}
                    options={[
                      { value: '', label: 'Sin asignar' },
                      ...warehouseList.filter(w => w.active).map(w => ({
                        value: w.id,
                        label: w.name,
                        hint: w.description ?? undefined,
                      })),
                    ]}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Precio de venta ($)</label>
                    <input style={inputStyle} type="number" min="0" step="any" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Stock mínimo</label>
                    <input style={inputStyle} type="number" min="0" step="any" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>
                    Unidad de medida{currentStock > 0 ? ' — bloqueada (hay stock activo)' : ''}
                  </label>
                  {currentStock > 0 ? (
                    <div style={{ ...inputStyle, background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'not-allowed', opacity: 0.7 }}>
                      {UNIT_LABELS[unitOfMeasure] ?? unitOfMeasure}
                    </div>
                  ) : (
                    <Select
                      style={{ width: '100%' }}
                      value={unitOfMeasure}
                      onChange={(v) => setUnitOfMeasure(v as UnitOfMeasure)}
                      options={Object.entries(UNIT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>SKU</label>
                    <input style={inputStyle} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="PRO-000001" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Código de barras</label>
                    <input style={inputStyle} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="7400001234567" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Descripción</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción opcional del producto"
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                  <input type="checkbox" checked={inventoryTracking} onChange={(e) => setInventoryTracking(e.target.checked)} />
                  Control de inventario activado
                </label>
              </div>
            )}

            {/* ── Tab Lotes ── */}
            {tab === 'lots' && (
              <LotsTab lots={lots} product={product} />
            )}

            {/* ── Tab Movimientos ── */}
            {tab === 'movements' && (
              <div>
                {movements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    Sin movimientos registrados
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['Tipo', 'Cantidad', 'Costo unit.', 'Ubicación', 'Notas', 'Fecha'].map((h) => (
                            <th key={h} style={{ ...thStyle }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => {
                          const isTransfer = m.movementType === 'TRANSFER'
                          const isPositive = m.movementType === 'ENTRY' || m.movementType === 'POSITIVE_ADJUSTMENT'
                          const locationText = isTransfer
                            ? `${m.fromLocationName ?? '?'} → ${m.toLocationName ?? '?'}`
                            : (m.toLocationName ?? m.fromLocationName ?? '—')
                          return (
                            <tr key={m.id}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                              <td style={tdStyle}>
                                <StatusChip
                                  status={isTransfer ? 'low' : (isPositive ? 'ok' : 'warn')}
                                  label={MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                                />
                              </td>
                              <td style={{ ...tdStyle, fontWeight: 700 }}>{formatQty(m.quantity, 3, true)}</td>
                              <td style={tdStyle}>{m.unitCost != null ? formatCOP(m.unitCost) : '—'}</td>
                              <td style={{ ...tdStyle, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{locationText}</td>
                              <td style={{ ...tdStyle, color: 'var(--muted)' }}>{m.notes ?? m.reason ?? '—'}</td>
                              <td style={{ ...tdStyle, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(m.createdAt)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showTransfer && (
      <TransferModal
        product={product}
        warehouseStocks={warehouseStocks}
        onClose={() => setShowTransfer(false)}
      />
    )}
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
  warehouseId: string | null
  warehouseName: string | null
  warehouseStocks: WarehouseStockDto[]
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
  const [selectedProduct, setSelectedProduct] = useState<{ product: ProductDto; stock: number; warehouseStocks: WarehouseStockDto[] } | null>(null)
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
    const map: Record<string, { currentStock: number; stockStatus: StockStatus; warehouseStocks: WarehouseStockDto[] }> = {}
    stockPage?.content?.forEach((s) => {
      map[s.productId] = { currentStock: s.currentStock, stockStatus: s.stockStatus, warehouseStocks: s.warehouseStocks ?? [] }
    })
    return map
  }, [stockPage])

  const allProducts = productsPage?.content ?? []

  const categories = useMemo(() => {
    const cats = new Set<string>()
    allProducts.forEach((p) => { if (p.categoryName) cats.add(p.categoryName) })
    return Array.from(cats).sort()
  }, [allProducts])

  const warehouseOptions = useMemo(() => {
    const map = new Map<string, string>()
    Object.values(stockMap).forEach(({ warehouseStocks }) => {
      warehouseStocks.forEach(ws => map.set(ws.warehouseId, ws.warehouseName))
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [stockMap])

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
        warehouseId: p.warehouseId,
        warehouseName: p.warehouseName,
        warehouseStocks: stock?.warehouseStocks ?? [],
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
      const matchWarehouse = warehouseFilter === 'all' ||
        p.warehouseStocks.some(ws => ws.warehouseId === warehouseFilter)
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

  // ── Product detail page — after all hooks ─────────────────────────────────
  if (selectedProduct) {
    const liveStock = stockMap[selectedProduct.product.id]
    return (
      <ProductDetailPage
        product={selectedProduct.product}
        currentStock={liveStock?.currentStock ?? selectedProduct.stock}
        stockStatus={liveStock?.stockStatus ?? 'OUT_OF_STOCK'}
        warehouseStocks={liveStock?.warehouseStocks ?? selectedProduct.warehouseStocks}
        onClose={() => setSelectedProduct(null)}
        onDeleted={() => setSelectedProduct(null)}
        onUpdated={(updated) => setSelectedProduct({ product: updated, stock: selectedProduct.stock, warehouseStocks: selectedProduct.warehouseStocks })}
      />
    )
  }

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
                <span>Stock disponible: <b>{formatQty(lot.availableQuantity, 3, true)}</b></span>
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
          {warehouseOptions.length > 0 && (
            <FilterSelect value={warehouseFilter} onChange={handleFilterChange(setWarehouseFilter)} options={[
              { value: 'all', label: 'Almacén' },
              ...warehouseOptions.map(([id, name]) => ({ value: id, label: name })),
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
                  <th style={thStyle}>Almacén</th>
                  <th style={thStyle}>{t.th_status}</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group) => {
                  const isCollapsed = collapsedCategories.has(group.category)
                  return (
                  <>
                    <tr key={`hdr-${group.category}`} onClick={() => toggleCategory(group.category)} style={{ cursor: 'pointer' }}>
                      <td colSpan={7} style={catHeaderStyle}>
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
                            if (fullProduct) setSelectedProduct({ product: fullProduct, stock: p.currentStock, warehouseStocks: p.warehouseStocks })
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
                            {formatQty(p.currentStock, 3, true)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--muted)' }}>
                            {p.minimumStock != null ? p.minimumStock : '—'}
                          </td>
                          <td style={tdStyle}>
                            {p.warehouseStocks.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {p.warehouseStocks.map(ws => (
                                  <span key={ws.warehouseId} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: 'var(--accent-weak)', color: 'var(--accent-text)',
                                    borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}>
                                    📦 {ws.warehouseName}
                                    <span style={{ fontWeight: 400, opacity: 0.75 }}>
                                      · {formatQty(ws.stock, 3, true)} {p.unitOfMeasure}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--faint)', fontSize: 12 }}>—</span>
                            )}
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
