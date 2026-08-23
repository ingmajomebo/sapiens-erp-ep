import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import type { BrandColors } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import { Card, Select } from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { warehouseApi } from '../inventory/api/warehouseApi'
import type { WarehouseDto } from '../inventory/api/warehouseApi'
import { toast } from '../../shared/toast'
import client from '../../api/client'
import { rolesApi } from './api/rolesApi'
import { StorefrontSection } from './StorefrontSection'
import { UsersSection } from './UsersSection'
import type { RoleDto, PermissionDto } from './api/rolesApi'

const adminApi = {
  resetData: () => client.post('/admin/reset-data').then(r => r.data),
  selectiveReset: (payload: {
    salesOrders: boolean
    invoices: boolean
    accountsReceivable: boolean
    expenses: boolean
  }) => client.post('/admin/selective-reset', payload).then(r => r.data),
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2 MB

interface ColorField {
  key: keyof BrandColors
  labelKey: keyof typeof translations.en
  defaultLight: string
  defaultDark: string
}

// Defaults = sistema de color de la marca "Encanto Pacífico" (definido en index.css)
const COLOR_FIELDS: ColorField[] = [
  { key: 'accent',    labelKey: 'set_color_accent',  defaultLight: '#0f7c74', defaultDark: '#3fbdb2' },
  { key: 'pos',       labelKey: 'set_color_pos',     defaultLight: '#177a55', defaultDark: '#5cc99a' },
  { key: 'neg',       labelKey: 'set_color_neg',     defaultLight: '#99373a', defaultDark: '#e57e73' },
  { key: 'warn',      labelKey: 'set_color_warn',    defaultLight: '#9a5b00', defaultDark: '#e3a44a' },
  { key: 'sidebarBg', labelKey: 'set_color_sidebar', defaultLight: '#f4f3ec', defaultDark: '#0a1012' },
]

// La paleta de la marca ES el tema por defecto (index.css). Esta tarjeta la
// muestra como referencia y permite volver a ella si se personalizaron colores.
const BRAND_PALETTE = {
  name: 'Encanto Pacífico',
  swatches: ['#8c2b2e', '#be4a24', '#e89a2e', '#e6d6a9', '#8acfb4', '#1e8a8a', '#082630'],
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
      {children}
    </div>
  )
}

export function Settings() {
  const { lang, theme, brandLogo, companyName, brandColors, setBrandLogo, setCompanyName, setBrandColors, resetBrandColors } = useAppStore()
  const t = translations[lang]

  const [tab, setTab] = useState<'brand' | 'colors' | 'storefront' | 'warehouses' | 'data' | 'users' | 'roles'>('brand')
  const [nameInput, setNameInput] = useState(companyName)
  const [saved, setSaved] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setNameInput(companyName) }, [companyName])

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('File exceeds 2 MB limit.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setBrandLogo(result)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleSaveBrand() {
    setCompanyName(nameInput.trim() || companyName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleColorChange(key: keyof BrandColors, value: string) {
    setBrandColors({ [key]: value })
  }

  function getColorValue(field: ColorField): string {
    return brandColors[field.key] ?? (theme === 'dark' ? field.defaultDark : field.defaultLight)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ padding: '24px 26px 48px', maxWidth: 720, animation: 'fadeUp 0.25s ease' }}>
      {/* Tab bar */}
      <div style={{
        display: 'inline-flex',
        gap: 2,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 3,
        marginBottom: 28,
      }}>
        <button style={tabStyle(tab === 'brand')}      onClick={() => setTab('brand')}>
          {t.set_brand_tab}
        </button>
        <button style={tabStyle(tab === 'colors')}     onClick={() => setTab('colors')}>
          {t.set_colors_tab}
        </button>
        <button style={tabStyle(tab === 'storefront')} onClick={() => setTab('storefront')}>
          Página de venta
        </button>
        <button style={tabStyle(tab === 'warehouses')} onClick={() => setTab('warehouses')}>
          Almacenes
        </button>
        <button style={tabStyle(tab === 'data')} onClick={() => setTab('data')}>
          Datos
        </button>
        <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>
          Usuarios
        </button>
        <button style={tabStyle(tab === 'roles')} onClick={() => setTab('roles')}>
          Roles
        </button>
      </div>

      {/* ── BRAND TAB ── */}
      {tab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Logo upload */}
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_logo_label}</SectionTitle>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 14,
                  border: `2px dashed ${brandLogo ? 'var(--accent-line)' : 'var(--border)'}`,
                  background: brandLogo ? 'var(--accent-weak)' : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = brandLogo ? 'var(--accent-line)' : 'var(--border)')}
              >
                {brandLogo ? (
                  <img src={brandLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--faint)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>Upload</div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  {t.set_logo_hint}
                </div>
                {logoError && (
                  <div style={{ fontSize: 12, color: 'var(--neg)', marginBottom: 10 }}>{logoError}</div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent-weak)',
                      color: 'var(--accent-text)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {brandLogo ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  {brandLogo && (
                    <button
                      onClick={() => setBrandLogo(null)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--neg)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t.set_logo_clear}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Company name */}
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_company_name}</SectionTitle>
            <FieldLabel>{t.set_company_name}</FieldLabel>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="La Pescadería"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </Card>

          {/* Save button + feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSaveBrand}
              style={{
                padding: '9px 20px',
                borderRadius: 9,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {t.set_save_brand}
            </button>
            {saved && (
              <span style={{
                fontSize: 13,
                color: 'var(--pos)',
                fontWeight: 600,
                animation: 'fadeUp 0.2s ease',
              }}>
                ✓ {t.set_saved}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── COLORS TAB ── */}
      {tab === 'colors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Presets de marca: aplican toda la paleta de un clic */}
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_presets_title}</SectionTitle>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
              {t.set_presets_hint}
            </div>
            {(() => {
              const applied = Object.keys(brandColors).length === 0
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{BRAND_PALETTE.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {BRAND_PALETTE.swatches.map((c) => (
                        <span key={c} title={c} style={{
                          width: 30, height: 30, borderRadius: 8, background: c,
                          border: '1px solid var(--border)', flexShrink: 0,
                        }} />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={resetBrandColors}
                    disabled={applied}
                    style={{
                      padding: '9px 18px', borderRadius: 9, border: 'none',
                      background: applied ? 'var(--pos)' : 'var(--accent)', color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: applied ? 'default' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 7, opacity: applied ? 0.9 : 1,
                    }}
                  >
                    {applied ? `✓ ${t.set_preset_applied}` : t.set_preset_apply}
                  </button>
                </div>
              )
            })()}
          </Card>

          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_colors_title}</SectionTitle>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              {t.set_colors_hint}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {COLOR_FIELDS.map((field) => {
                const currentValue = getColorValue(field)
                const isCustom = !!brandColors[field.key]
                return (
                  <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Color swatch + picker */}
                    <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: currentValue,
                        border: '2px solid var(--border)',
                        boxShadow: `0 0 0 3px ${currentValue}22`,
                        transition: 'box-shadow 0.15s',
                      }} />
                      <input
                        type="color"
                        value={currentValue}
                        onChange={(e) => handleColorChange(field.key, e.target.value)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                        }}
                      />
                    </label>

                    {/* Label + value */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {t[field.labelKey]}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>
                        {currentValue}
                        {isCustom && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: 'var(--accent-text)',
                            background: 'var(--accent-weak)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}>
                            personalizado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reset individual color */}
                    {isCustom && (
                      <button
                        onClick={() => {
                          const copy = { ...brandColors }
                          delete copy[field.key]
                          useAppStore.setState({ brandColors: copy })
                        }}
                        title="Reset to default"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontFamily: 'inherit',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 8a6 6 0 1 0 1.5-3.9"/>
                          <path d="M2 3.5V8h4.5"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Reset all */}
          <div>
            <button
              onClick={resetBrandColors}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t.set_reset_colors}
            </button>
          </div>
        </div>
      )}

      {/* ── WAREHOUSES TAB ── */}
      {tab === 'storefront' && <StorefrontSection />}

      {tab === 'warehouses' && <WarehousesSection />}

      {/* ── DATA TAB ── */}
      {tab === 'data' && <DataSection />}

      {/* ── ROLES TAB ── */}
      {tab === 'users' && <UsersSection />}

      {tab === 'roles' && <RolesSection />}
    </div>
  )
}

// ── Warehouse Modal ──────────────────────────────────────────��────────────────

function WarehouseModal({ warehouse, onClose, onSaved }: {
  warehouse: WarehouseDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(warehouse?.name ?? '')
  const [capacity, setCapacity] = useState(warehouse?.capacity != null ? String(warehouse.capacity) : '')
  const [capacityUnit, setCapacityUnit] = useState(warehouse?.capacityUnit ?? 'kg')
  const [description, setDescription] = useState(warehouse?.description ?? '')
  const [error, setError] = useState('')

  const saveMut = useMutation({
    mutationFn: () => {
      const req = {
        name: name.trim(),
        capacity: capacity ? parseFloat(capacity) : null,
        capacityUnit,
        description: description.trim() || undefined,
      }
      return warehouse ? warehouseApi.update(warehouse.id, req) : warehouseApi.create(req)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast(warehouse ? 'Almacén actualizado' : 'Almacén creado', 'success')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      setError(msg)
    },
  })

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9200,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }
  const modal: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, width: '100%', maxWidth: 440,
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)', animation: 'fadeUp 0.18s ease',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{warehouse ? 'Editar almacén' : 'Nuevo almacén'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Nombre *</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Nevera principal" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Capacidad máxima</label>
              <input style={inp} type="number" min="0" step="0.001" value={capacity}
                onChange={e => setCapacity(e.target.value)} placeholder="500" />
            </div>
            <div>
              <label style={lbl}>Unidad</label>
              <Select
                style={{ width: '100%' }}
                value={capacityUnit}
                onChange={v => setCapacityUnit(v)}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                  { value: 'und', label: 'und' },
                  { value: 'm³', label: 'm³' },
                ]}
              />
            </div>
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <input style={inp} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="ej. Cámara de refrigeración -2°C" />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--neg)', background: 'var(--neg-bg)', borderRadius: 6, padding: '6px 10px' }}>
              {error}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (!name.trim()) { setError('El nombre es requerido'); return } setError(''); saveMut.mutate() }}
            disabled={saveMut.isPending}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: saveMut.isPending ? 0.7 : 1 }}
          >
            {saveMut.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Warehouses Section ────────────────────────────────────────────────────────

function WarehousesSection() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WarehouseDto | null>(null)

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.listAll,
    refetchOnMount: 'always',
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => warehouseApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); toast('Almacén eliminado', 'success') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo eliminar el almacén'
      toast(msg, 'error')
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Almacenes de almacenamiento</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            Configura los espacios físicos donde se guarda el inventario con su capacidad máxima.
          </div>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          + Nuevo almacén
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 13 }}>Cargando…</div>
      ) : warehouses.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 13 }}>No hay almacenes registrados.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {warehouses.map(w => {
            const pct = w.capacity && w.capacity > 0 ? Math.min(100, (w.currentStock / w.capacity) * 100) : null
            const barColor = pct == null ? 'var(--accent)' : pct > 90 ? 'var(--neg)' : pct > 70 ? 'var(--warn)' : 'var(--pos)'
            return (
              <Card key={w.id} style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>🏭 {w.name}</span>
                      {w.isDefault && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: 'var(--accent-text)', letterSpacing: '0.04em',
                        }}>
                          PREDETERMINADO
                        </span>
                      )}
                    </div>
                    {w.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{w.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditTarget(w); setShowModal(true) }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontFamily: 'inherit' }}>
                      Editar
                    </button>
                    <button
                      onClick={() => { if (!w.isDefault && confirm(`¿Eliminar "${w.name}"?`)) deleteMut.mutate(w.id) }}
                      disabled={w.isDefault}
                      title={w.isDefault ? 'No se puede eliminar la ubicación predeterminada' : `Eliminar ${w.name}`}
                      style={{
                        background: 'none',
                        border: `1px solid ${w.isDefault ? 'var(--border)' : 'color-mix(in srgb, var(--neg) 40%, transparent)'}`,
                        borderRadius: 6, padding: '3px 9px',
                        cursor: w.isDefault ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        color: w.isDefault ? 'var(--faint)' : 'var(--neg)',
                        fontFamily: 'inherit', opacity: w.isDefault ? 0.5 : 1,
                      }}>
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>Almacenado actualmente</span>
                  {w.capacity
                    ? <span style={{ fontWeight: 600, color: pct! > 90 ? 'var(--neg)' : 'var(--text-2)' }}>
                        {w.currentStock.toFixed(1)} / {w.capacity} {w.capacityUnit} ({pct!.toFixed(0)}%)
                      </span>
                    : <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{w.currentStock.toFixed(1)} {w.capacityUnit}</span>
                  }
                </div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--bg)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: pct != null ? `${pct}%` : '100%',
                    background: barColor, borderRadius: 4,
                    transition: 'width 0.4s ease',
                    opacity: pct == null ? 0.15 : 1,
                  }} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showModal && (
        <WarehouseModal
          warehouse={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ── Data Section ──────────────────────────────────────────────────────────────

type DataSelection = {
  salesOrders: boolean
  invoices: boolean
  accountsReceivable: boolean
  expenses: boolean
}

const DATA_OPTIONS: {
  key: keyof DataSelection
  label: string
  description: string
  dependsOn?: (keyof DataSelection)[]
}[] = [
  {
    key: 'salesOrders',
    label: 'Ventas',
    description: 'Órdenes de venta, líneas y registros de canal',
  },
  {
    key: 'invoices',
    label: 'Facturas',
    description: 'Facturas emitidas, borradores, notas crédito y pagos aplicados',
    dependsOn: ['salesOrders'],
  },
  {
    key: 'accountsReceivable',
    label: 'Cuentas por cobrar',
    description: 'CxC, recibos de pago y abonos registrados',
    dependsOn: ['salesOrders', 'invoices'],
  },
  {
    key: 'expenses',
    label: 'Gastos',
    description: 'Gastos operacionales y movimientos financieros asociados',
  },
]

function DataSection() {
  const qc = useQueryClient()
  const [selection, setSelection] = useState<DataSelection>({
    salesOrders: false,
    invoices: false,
    accountsReceivable: false,
    expenses: false,
  })
  const [confirmStep, setConfirmStep] = useState(false)
  const [typeConfirm, setTypeConfirm] = useState('')

  const noneSelected = !Object.values(selection).some(Boolean)

  function toggle(key: keyof DataSelection) {
    setSelection(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Al activar ventas → activar facturas y CxC en cascada
      if (key === 'salesOrders' && next.salesOrders) {
        next.invoices = true
        next.accountsReceivable = true
      }
      // Al activar facturas → activar CxC en cascada
      if (key === 'invoices' && next.invoices) {
        next.accountsReceivable = true
      }
      // Al desactivar CxC → desactivar facturas y ventas
      if (key === 'accountsReceivable' && !next.accountsReceivable) {
        next.invoices = false
        next.salesOrders = false
      }
      // Al desactivar facturas → desactivar ventas
      if (key === 'invoices' && !next.invoices) {
        next.salesOrders = false
      }
      return next
    })
  }

  const resetMut = useMutation({
    mutationFn: () => adminApi.selectiveReset(selection),
    onSuccess: () => {
      qc.clear()
      const labels = DATA_OPTIONS.filter(o => selection[o.key]).map(o => o.label).join(', ')
      toast(`Eliminado: ${labels}`, 'success')
      setConfirmStep(false)
      setTypeConfirm('')
      setSelection({ salesOrders: false, invoices: false, accountsReceivable: false, expenses: false })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar datos'
      toast(msg, 'error')
    },
  })

  const CONFIRM_WORD = 'ELIMINAR'
  const canConfirm = typeConfirm === CONFIRM_WORD

  const checkStyle = (checked: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
    background: checked ? 'var(--accent)' : 'var(--surface-2)',
    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Gestión de datos</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          Selecciona qué datos quieres eliminar. El resto se conserva intacto.
        </div>
      </div>

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Eliminar datos seleccionados</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
          Productos, proveedores, clientes, compras e inventario <strong style={{ color: 'var(--text)' }}>no se tocan</strong>.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {DATA_OPTIONS.map(opt => {
            const checked = selection[opt.key]
            const implied = opt.dependsOn?.some(dep => selection[dep]) ?? false
            return (
              <div
                key={opt.key}
                onClick={() => toggle(opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  padding: '10px 14px', borderRadius: 9,
                  border: `1px solid ${checked ? 'color-mix(in srgb, var(--neg) 30%, transparent)' : 'var(--border)'}`,
                  background: checked
                    ? 'color-mix(in srgb, var(--neg) 5%, transparent)'
                    : 'var(--surface-2)',
                  transition: 'border-color 0.12s, background 0.12s',
                  userSelect: 'none',
                }}
              >
                <div style={checkStyle(checked)}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: checked ? 'var(--neg)' : 'var(--text)' }}>
                    {opt.label}
                    {implied && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-bg)', padding: '1px 6px', borderRadius: 4 }}>
                        incluido por cascada
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{opt.description}</div>
                </div>
              </div>
            )
          })}
        </div>

        {!confirmStep ? (
          <Button variant="danger" disabled={noneSelected} onClick={() => setConfirmStep(true)}>
            {noneSelected ? 'Selecciona al menos un módulo' : `Eliminar ${DATA_OPTIONS.filter(o => selection[o.key]).map(o => o.label).join(', ')}…`}
          </Button>
        ) : (
          <div style={{
            background: 'color-mix(in srgb, var(--neg) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--neg) 30%, transparent)',
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--neg)', marginBottom: 4 }}>
              ¿Confirmar eliminación?
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Se eliminarán: <strong style={{ color: 'var(--text)' }}>{DATA_OPTIONS.filter(o => selection[o.key]).map(o => o.label).join(', ')}</strong>.<br />
              Escribe <strong style={{ color: 'var(--text)' }}>{CONFIRM_WORD}</strong> para confirmar.
            </div>
            <input
              type="text"
              value={typeConfirm}
              onChange={e => setTypeConfirm(e.target.value)}
              placeholder={CONFIRM_WORD}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1px solid ${canConfirm ? 'var(--neg)' : 'var(--border)'}`,
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 13.5, fontFamily: 'monospace', outline: 'none',
                marginBottom: 14, boxSizing: 'border-box',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="ghost"
                onClick={() => { setConfirmStep(false); setTypeConfirm('') }}
                disabled={resetMut.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={!canConfirm}
                loading={resetMut.isPending}
                onClick={() => resetMut.mutate()}
              >
                {resetMut.isPending ? 'Eliminando…' : 'Confirmar eliminación'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Roles & Permissions Section ───────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  CATALOG: 'Catálogo',
  INVENTORY: 'Inventario',
  PROCUREMENT: 'Compras',
  SALES: 'Ventas',
  FINANCE: 'Finanzas',
  REPORTS: 'Reportes',
  IDENTITY: 'Identidad',
}

function RolesSection() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<RoleDto | null>(null)

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.listRoles,
  })
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissions,
  })

  const selected = roles.find(r => r.id === selectedId) ?? roles[0] ?? null

  const deleteMut = useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast('Rol eliminado', 'success') },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo eliminar'
      toast(msg, 'error')
    },
  })

  const col: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, overflow: 'hidden',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Roles y permisos</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            Configura los roles del sistema y qué operaciones puede realizar cada uno.
          </div>
        </div>
        <button
          onClick={() => { setEditRole(null); setShowForm(true) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
        >
          + Nuevo rol
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Role list */}
        <div style={col}>
          {loadingRoles ? (
            <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
          ) : roles.map(role => (
            <div
              key={role.id}
              onClick={() => setSelectedId(role.id)}
              style={{
                padding: '11px 14px',
                cursor: 'pointer',
                background: (selectedId ?? roles[0]?.id) === role.id ? 'var(--accent-weak)' : 'transparent',
                borderLeft: (selectedId ?? roles[0]?.id) === role.id ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'background 0.12s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{role.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    {role.userCount} usuario{role.userCount !== 1 ? 's' : ''}
                    {role.system && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>SISTEMA</span>}
                  </div>
                </div>
                {!role.system && (
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditRole(role); setShowForm(true) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: '2px 4px' }}
                    >✏</button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar el rol "${role.name}"?`)) deleteMut.mutate(role.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', fontSize: 12, padding: '2px 4px' }}
                    >✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Permission matrix for selected role */}
        {selected && (
          <PermissionMatrix
            role={selected}
            permissions={permissions}
            onEdit={() => { setEditRole(selected); setShowForm(true) }}
          />
        )}
      </div>

      {showForm && (
        <RoleFormModal
          role={editRole}
          permissions={permissions}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['roles'] }) }}
        />
      )}
    </div>
  )
}

function PermissionMatrix({ role, permissions, onEdit }: {
  role: RoleDto
  permissions: PermissionDto[]
  onEdit: () => void
}) {
  const byModule = useMemo(() => {
    const map: Record<string, PermissionDto[]> = {}
    for (const p of permissions) {
      if (!map[p.module]) map[p.module] = []
      map[p.module].push(p)
    }
    return map
  }, [permissions])

  const col: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 18px',
  }

  return (
    <div style={col}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{role.name}</span>
          {role.description && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>{role.description}</span>}
        </div>
        <button onClick={onEdit} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
          Editar permisos
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(byModule).map(([mod, perms]) => (
          <div key={mod}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              {MODULE_LABELS[mod] ?? mod}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
              {perms.map(p => {
                const has = role.permissionCodes.includes(p.code)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      background: has ? 'var(--accent)' : 'var(--surface-2)',
                      border: `1.5px solid ${has ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {has && <svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: has ? 'var(--text)' : 'var(--muted)' }}>{p.description}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleFormModal({ role, permissions, onClose, onSaved }: {
  role: RoleDto | null
  permissions: PermissionDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role?.permissionCodes ?? [])
  )
  const [error, setError] = useState('')

  const byModule = useMemo(() => {
    const map: Record<string, PermissionDto[]> = {}
    for (const p of permissions) {
      if (!map[p.module]) map[p.module] = []
      map[p.module].push(p)
    }
    return map
  }, [permissions])

  const saveMut = useMutation({
    mutationFn: () => {
      const permIds = permissions.filter(p => selected.has(p.code)).map(p => p.id)
      const req = { name: name.trim(), description: description.trim(), permissionIds: permIds }
      return role ? rolesApi.updateRole(role.id, req) : rolesApi.createRole(req)
    },
    onSuccess: () => { toast(role ? 'Rol actualizado' : 'Rol creado', 'success'); onSaved() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      setError(msg)
    },
  })

  function togglePerm(code: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function toggleModule(mod: string) {
    const modCodes = (byModule[mod] ?? []).map(p => p.code)
    const allOn = modCodes.every(c => selected.has(c))
    setSelected(prev => {
      const next = new Set(prev)
      allOn ? modCodes.forEach(c => next.delete(c)) : modCodes.forEach(c => next.add(c))
      return next
    })
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9300,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }
  const modal: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)', animation: 'fadeUp 0.18s ease',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, display: 'block',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{role ? `Editar rol: ${role.name}` : 'Nuevo rol'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name + description */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Nombre del rol *</label>
              <input
                style={inp}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ej. CAJERO"
                disabled={role?.system}
              />
              {role?.system && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>El nombre de roles del sistema no se puede cambiar.</div>}
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <input style={inp} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve del rol" />
            </div>
          </div>

          {/* Permission matrix */}
          <div>
            <label style={{ ...lbl, marginBottom: 12 }}>Permisos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(byModule).map(([mod, perms]) => {
                const modCodes = perms.map(p => p.code)
                const allOn = modCodes.every(c => selected.has(c))
                const someOn = modCodes.some(c => selected.has(c))
                return (
                  <div key={mod} style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
                    <div
                      onClick={() => toggleModule(mod)}
                      style={{ padding: '8px 12px', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: allOn ? 'var(--accent)' : someOn ? 'var(--accent-weak)' : 'var(--surface)',
                        border: `1.5px solid ${allOn || someOn ? 'var(--accent)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {allOn && <svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {!allOn && someOn && <div style={{ width: 8, height: 2, background: 'var(--accent)', borderRadius: 1 }} />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {MODULE_LABELS[mod] ?? mod}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                      {perms.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12.5 }}>
                          <div
                            onClick={() => togglePerm(p.code)}
                            style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              background: selected.has(p.code) ? 'var(--accent)' : 'var(--surface)',
                              border: `1.5px solid ${selected.has(p.code) ? 'var(--accent)' : 'var(--border)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {selected.has(p.code) && <svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span onClick={() => togglePerm(p.code)} style={{ color: 'var(--text)' }}>{p.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && <div style={{ color: 'var(--neg)', fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name.trim()}>
            {saveMut.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
