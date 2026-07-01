import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { Button } from './Button'
import { toast } from './toast'
import { formatCOP } from './currency'
import { productApi, categoryApi } from '../features/catalog/api/productApi'
import { supplierApi } from '../features/procurement/api/supplierApi'
import { purchaseOrderApi } from '../features/procurement/api/purchaseOrderApi'
import type { UnitOfMeasure, ProductType, ProductStatus } from './types'

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="3" y1="3" x2="13" y2="13"/>
    <line x1="13" y1="3" x2="3" y2="13"/>
  </svg>
)

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="7" width="10" height="8" rx="1.5"/>
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
  </svg>
)

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, note, required, error }: { label: string; children: React.ReactNode; note?: string; required?: boolean; error?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--neg)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 3, fontWeight: 500 }}>{error}</div>
      )}
      {note && !error && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <LockIcon />{note}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 11px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ── Product Form ────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  CONSUMER_GOOD: 'Producto de consumo',
  RAW_MATERIAL: 'Materia prima',
  INTERNAL_SUPPLY: 'Insumo de uso interno',
  SERVICE_ASSOCIATED: 'Asociado a servicio',
}

const UNIT_LABELS: Record<string, string> = {
  KG: 'Kilogramo (kg)',
  LB: 'Libra (lb)',
  UNIT: 'Unidad (ud)',
  PACKAGE: 'Paquete (pkg)',
  LITER: 'Litro (L)',
}

function ProductForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Section 1: General
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [barcode, setBarcode] = useState('')
  const [productType, setProductType] = useState<ProductType | ''>('')

  // Section 2: Prices
  const [salePrice, setSalePrice] = useState('')

  // Section 3: Inventory config
  const [categoryId, setCategoryId] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>('KG')
  const [inventoryTracking, setInventoryTracking] = useState(true)
  const [defaultWarehouse, setDefaultWarehouse] = useState('')
  const [minimumStock, setMinimumStock] = useState('')

  // Section 4: Status
  const [status, setStatus] = useState<ProductStatus>('ACTIVE')

  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const [catError, setCatError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  function clearError(field: string) {
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.listAll,
  })

  const createProduct = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setImageUrl('')
  }

  function handleImageUrlChange(url: string) {
    setImageUrl(url)
    setImagePreview(url || null)
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) { setCatError('Nombre requerido'); return }
    setSavingCat(true)
    setCatError('')
    try {
      const created = await categoryApi.create(newCatName.trim())
      await qc.invalidateQueries({ queryKey: ['categories'] })
      setCategoryId(created.id)
      setNewCatName('')
      setShowNewCat(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo crear la categoría'
      setCatError(msg)
    } finally {
      setSavingCat(false)
    }
  }

  async function handleSave() {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'El nombre del producto es requerido'
    if (!categoryId) errors.categoryId = 'La categoría es requerida'
    if (!productType) errors.productType = 'El tipo de producto es requerido'
    if (!salePrice) errors.salePrice = 'El precio de venta es requerido'
    if (!defaultWarehouse) errors.defaultWarehouse = 'El almacén de almacenamiento es requerido'

    if (Object.keys(errors).filter((k) => errors[k]).length > 0) {
      setFormErrors(errors)
      throw new Error(Object.values(errors).find(Boolean) ?? 'Completa los campos requeridos')
    }

    setFormErrors({})
    await createProduct.mutateAsync({
      name: name.trim(),
      categoryId,
      unitOfMeasure,
      productType: productType as ProductType,
      salePrice: parseFloat(salePrice),
      defaultWarehouse: defaultWarehouse.trim(),
      minimumStock: minimumStock ? parseFloat(minimumStock) : null,
      description: null,
      sku: null,
      barcode: barcode.trim() || null,
      inventoryTrackingEnabled: inventoryTracking,
      status,
      imageUrl: imageUrl.trim() || null,
    })
  }

  return (
    <>
      {/* Stock info banner */}
      <div style={{
        background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12.5,
        color: 'var(--accent-text)',
        marginBottom: 20,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}>
        <LockIcon />
        <span>El stock se calcula a partir de los movimientos de inventario y no puede editarse directamente. Se modifica mediante: <b>compra, venta, merma, ajuste o traspaso.</b></span>
      </div>

      {/* Section 1: General Info */}
      <FormSection title="Información general">
        <Field label="Nombre del producto" required error={formErrors.name}>
          <input
            style={{ ...inputStyle, ...(formErrors.name ? { borderColor: 'var(--neg)' } : {}) }}
            type="text"
            placeholder="ej. Salmón del Atlántico"
            value={name}
            onChange={(e) => { setName(e.target.value); clearError('name') }}
          />
        </Field>

        {/* Image */}
        <Field label="Foto del producto">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                style={inputStyle}
                type="url"
                placeholder="https://... (URL de la imagen)"
                value={imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>o</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 11.5, color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  seleccionar archivo (solo vista previa)
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            </div>
            {imagePreview && (
              <div style={{
                width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--border)', flexShrink: 0,
                background: 'var(--surface-2)',
              }}>
                <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImagePreview(null)} />
              </div>
            )}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Código interno / SKU" note="Se genera automáticamente al guardar (ej. PRO-000001)">
            <input
              style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed' }}
              type="text"
              value="Auto-generado"
              readOnly
            />
          </Field>
          <Field label="Código de barras">
            <input style={inputStyle} type="text" placeholder="7700000000000" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </Field>
        </div>

        <Field label="Tipo de producto" required error={formErrors.productType}>
          <select
            style={{ ...selectStyle, ...(formErrors.productType ? { borderColor: 'var(--neg)' } : {}) }}
            value={productType}
            onChange={(e) => { setProductType(e.target.value as ProductType); clearError('productType') }}
          >
            <option value="">— Seleccionar tipo *</option>
            {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      {/* Section 2: Prices */}
      <FormSection title="Precios">
        <Field label="Precio de venta" required error={formErrors.salePrice}>
          <input
            style={{ ...inputStyle, ...(formErrors.salePrice ? { borderColor: 'var(--neg)' } : {}) }}
            type="number"
            placeholder="0"
            min="0"
            value={salePrice}
            onChange={(e) => { setSalePrice(e.target.value); clearError('salePrice') }}
          />
        </Field>
        <div style={{
          background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          borderRadius: 8, padding: '9px 13px', fontSize: 12, color: 'var(--muted)',
          display: 'flex', alignItems: 'flex-start', gap: 7,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
          <span>El costo de compra no se registra aquí — se guarda automáticamente en cada orden de compra. Puedes ver el historial de precios pagados en el detalle del producto.</span>
        </div>
        <Field label="Categoría fiscal">
          <select style={selectStyle} disabled>
            <option value="">— Opcional (próximamente)</option>
          </select>
        </Field>
      </FormSection>

      {/* Section 3: Inventory config */}
      <FormSection title="Configuración de inventario">
        <Field label="Categoría" required error={formErrors.categoryId}>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              style={{ ...selectStyle, flex: 1, ...(formErrors.categoryId ? { borderColor: 'var(--neg)' } : {}) }}
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); clearError('categoryId') }}
            >
              <option value="">— Seleccionar categoría *</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => { setShowNewCat((v) => !v); setCatError('') }}
              style={{
                flexShrink: 0, width: 34, height: 34, borderRadius: 8,
                border: '1px solid var(--border)',
                background: showNewCat ? 'var(--accent)' : 'var(--surface-2)',
                color: showNewCat ? '#fff' : 'var(--text-2)',
                fontSize: 18, lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 140ms ease, color 140ms ease',
              }}
            >
              {showNewCat ? '×' : '+'}
            </button>
          </div>
          {showNewCat && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input autoFocus style={{ ...inputStyle, flex: 1 }} placeholder="Nombre de categoría..."
                  value={newCatName}
                  onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }} />
                <Button variant="primary" size="sm" loading={savingCat} onClick={handleCreateCategory}>Agregar</Button>
              </div>
              {catError && <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--neg)' }}>{catError}</div>}
            </div>
          )}
        </Field>

        <Field label="Tipo de unidad">
          <select style={selectStyle} value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value as UnitOfMeasure)}>
            {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>

        <Field label="Control de inventario">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ position: 'relative', width: 36, height: 20 }}>
              <input type="checkbox" checked={inventoryTracking} onChange={(e) => setInventoryTracking(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: inventoryTracking ? 'var(--accent)' : 'var(--border)',
                transition: 'background 200ms ease', cursor: 'pointer',
              }} onClick={() => setInventoryTracking((v) => !v)} />
              <div style={{
                position: 'absolute', top: 2, left: inventoryTracking ? 18 : 2, width: 16, height: 16,
                borderRadius: 8, background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 200ms ease',
              }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {inventoryTracking ? 'Activado' : 'Desactivado'}
            </span>
          </label>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Almacén de almacenamiento" required error={formErrors.defaultWarehouse}>
            <select
              style={{ ...selectStyle, ...(formErrors.defaultWarehouse ? { borderColor: 'var(--neg)' } : {}) }}
              value={defaultWarehouse}
              onChange={(e) => { setDefaultWarehouse(e.target.value); clearError('defaultWarehouse') }}
            >
              <option value="">— Seleccionar almacén *</option>
              <option value="Bodega principal">Bodega principal</option>
              <option value="Nevera principal">Nevera principal</option>
              <option value="Nevera de exhibición">Nevera de exhibición</option>
              <option value="Congelador">Congelador</option>
              <option value="Punto de venta">Punto de venta</option>
            </select>
          </Field>
          <Field label="Stock mínimo">
            <input style={inputStyle} type="number" placeholder="0" min="0" step="0.001"
              value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} />
          </Field>
        </div>

        <Field label="Stock actual" note="El stock no puede editarse directamente — se actualiza mediante movimientos">
          <input style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed' }}
            type="text" value="0" readOnly />
        </Field>
      </FormSection>

      {/* Section 4: Status */}
      <FormSection title="Estado del producto">
        <Field label="Estado">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['DRAFT', 'ACTIVE', 'INACTIVE'] as ProductStatus[]).map((s) => {
              const label = s === 'DRAFT' ? 'Borrador' : s === 'ACTIVE' ? 'Activo' : 'Inactivo'
              const color = s === 'ACTIVE' ? 'var(--pos)' : s === 'DRAFT' ? 'var(--warn)' : 'var(--muted)'
              const bg = s === 'ACTIVE' ? 'var(--pos-bg)' : s === 'DRAFT' ? 'var(--warn-bg)' : 'var(--bg)'
              const active = status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
                    border: active ? `1.5px solid ${color}` : '1.5px solid var(--border)',
                    background: active ? bg : 'var(--surface-2)',
                    color: active ? color : 'var(--muted)',
                    fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                    transition: 'all 140ms ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      </FormSection>

      <DrawerFooter
        onClose={closeDrawer}
        saveLabel={t.btn_save}
        cancelLabel={t.btn_cancel}
        drawerType="product"
        onSave={handleSave}
      />
    </>
  )
}

// ── Supplier Form ────────────────────────────────────────────────────────────

function SupplierForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [notes, setNotes] = useState('')
  const [taxIdError, setTaxIdError] = useState('')

  const createSupplier = useMutation({
    mutationFn: supplierApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  async function handleSave() {
    if (!name.trim()) throw new Error('Nombre del proveedor requerido')
    if (!taxId.trim()) {
      setTaxIdError('El NIF es obligatorio')
      throw new Error('El NIF es obligatorio')
    }
    setTaxIdError('')
    await createSupplier.mutateAsync({
      name: name.trim(),
      contactName: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      taxId: taxId.trim(),
      notes: notes.trim() || null,
    })
  }

  return (
    <>
      <FormSection title={t.sec_general}>
        <Field label={`${t.th_supplier} *`}>
          <input style={inputStyle} type="text" placeholder="ej. Costera Seafood S.A."
            value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={`${t.f_tax_id} *`} required error={taxIdError}>
          <input style={inputStyle} type="text" placeholder="900-123456-7"
            value={taxId} onChange={(e) => { setTaxId(e.target.value); if (e.target.value.trim()) setTaxIdError('') }} />
        </Field>
      </FormSection>
      <FormSection title={t.sec_contact}>
        <Field label={t.f_contact_name}>
          <input style={inputStyle} type="text" placeholder="María López"
            value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t.f_email}>
            <input style={inputStyle} type="email" placeholder="contact@proveedor.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t.f_phone}>
            <input style={inputStyle} type="tel" placeholder="+57 300 000 0000"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label={t.f_address}>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            placeholder="Carrera 10 # 20-30, Bogotá"
            value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </FormSection>
      <FormSection title={t.sec_extra}>
        <Field label={t.f_notes}>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            placeholder="Notas opcionales..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </FormSection>
      <DrawerFooter onClose={closeDrawer} saveLabel={t.btn_save} cancelLabel={t.btn_cancel}
        drawerType="supplier" onSave={handleSave} />
    </>
  )
}

// ── Purchase Order Form ────────────────────────────────────────────────────

interface POLine {
  id: number
  productId: string
  quantity: string
  unitCost: string
  taxRate: string
  discount: string
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmada', RECEIVED: 'Recibida', CANCELLED: 'Cancelada',
}

function POForm() {
  const { closeDrawer } = useAppStore()
  const qc = useQueryClient()

  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [supplierId, setSupplierId] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState(nextWeek)
  const [warehouse, setWarehouse] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('30 días')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<POLine[]>([
    { id: 1, productId: '', quantity: '', unitCost: '', taxRate: '0', discount: '0' },
  ])
  const [saving, setSaving] = useState(false)

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierApi.listAll })
  const { data: productsPage } = useQuery({ queryKey: ['products'], queryFn: () => productApi.listAll(0, 200) })
  const products = productsPage?.content ?? []
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  function updateLine(id: number, field: keyof Omit<POLine, 'id'>, value: string) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  function addLine() {
    setLines((ls) => [...ls, { id: Date.now(), productId: '', quantity: '', unitCost: '', taxRate: '0', discount: '0' }])
  }

  function removeLine(id: number) {
    setLines((ls) => ls.filter((l) => l.id !== id))
  }

  const validLines = lines.filter(
    (l) => l.productId && parseFloat(l.quantity) > 0 && parseFloat(l.unitCost) >= 0,
  )

  function calcLine(l: POLine) {
    const qty = parseFloat(l.quantity || '0')
    const cost = parseFloat(l.unitCost || '0')
    const disc = parseFloat(l.discount || '0')
    const iva = parseFloat(l.taxRate || '0')
    const net = qty * cost * (1 - disc / 100)
    const tax = net * iva / 100
    return { net, tax, lineTotal: net + tax }
  }

  const subtotal = validLines.reduce((s, l) => s + calcLine(l).net, 0)
  const totalTax = validLines.reduce((s, l) => s + calcLine(l).tax, 0)
  const total = subtotal + totalTax

  async function buildAndCreate() {
    if (!supplierId) throw new Error('Selecciona un proveedor')
    if (validLines.length === 0) throw new Error('Agrega al menos un producto válido')
    return purchaseOrderApi.create({
      supplierId,
      expectedDelivery: expectedDelivery || null,
      warehouse: warehouse || null,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      lines: validLines.map((l) => ({
        productId: l.productId,
        quantity: parseFloat(l.quantity),
        unitCost: parseFloat(l.unitCost),
        taxRate: parseFloat(l.taxRate || '0'),
        discount: parseFloat(l.discount || '0'),
      })),
    })
  }

  async function handleAction(action: 'draft' | 'confirm' | 'receive') {
    setSaving(true)
    try {
      const po = await buildAndCreate()
      if (action === 'confirm') await purchaseOrderApi.confirm(po.id)
      await qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      await qc.invalidateQueries({ queryKey: ['stock'] })
      await qc.invalidateQueries({ queryKey: ['movements'] })
      closeDrawer()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Error al guardar la orden')
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const poThStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--muted)',
    padding: '8px 10px 8px',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }
  const poTdStyle: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'middle' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>
      {/* Header fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Proveedor">
          <select style={selectStyle} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Seleccionar proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="OC Nº">
          <input style={{ ...inputStyle, color: 'var(--muted)', background: 'var(--bg)' }}
            value="Auto-generado" readOnly />
        </Field>
        <Field label="Entrega prevista">
          <input style={inputStyle} type="date" value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)} />
        </Field>
        <Field label="Almacén">
          <select style={selectStyle} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            <option value="">— Seleccionar</option>
            <option>Cold Storage A</option>
            <option>Cold Storage B</option>
            <option>Almacén General</option>
          </select>
        </Field>
        <Field label="Condiciones de pago">
          <select style={selectStyle} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
            <option>Contado</option>
            <option>30 días</option>
            <option>60 días</option>
            <option>90 días</option>
          </select>
        </Field>
        <Field label="Estado de la orden">
          <input style={{ ...inputStyle, color: 'var(--muted)', background: 'var(--bg)' }}
            value={STATUS_LABEL['DRAFT']} readOnly />
        </Field>
      </div>

      {/* Lines table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Listado de productos
          </div>
          <Button variant="ghost" size="sm" onClick={addLine}>+ Añadir producto</Button>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...poThStyle, textAlign: 'left', minWidth: 160 }}>Producto</th>
                <th style={{ ...poThStyle, textAlign: 'right', width: 80 }}>Cantidad</th>
                <th style={{ ...poThStyle, textAlign: 'center', width: 56 }}>Unidad</th>
                <th style={{ ...poThStyle, textAlign: 'right', width: 100 }}>Costo unit.</th>
                <th style={{ ...poThStyle, textAlign: 'center', width: 68 }}>IVA %</th>
                <th style={{ ...poThStyle, textAlign: 'center', width: 72 }}>Desc. %</th>
                <th style={{ ...poThStyle, textAlign: 'right', width: 100 }}>Total línea</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const product = productMap[line.productId]
                const { lineTotal } = calcLine(line)
                const unitLabel = product?.unitOfMeasure === 'KG' ? 'kg'
                  : product?.unitOfMeasure === 'LB' ? 'lb'
                  : product?.unitOfMeasure === 'UNIT' ? 'ud'
                  : product?.unitOfMeasure === 'PACKAGE' ? 'pkg'
                  : product?.unitOfMeasure === 'LITER' ? 'L' : '—'
                return (
                  <tr key={line.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                    <td style={poTdStyle}>
                      <select style={{ ...selectStyle, fontSize: 12, minWidth: 140 }} value={line.productId}
                        onChange={(e) => updateLine(line.id, 'productId', e.target.value)}>
                        <option value="">— Producto</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={poTdStyle}>
                      <input style={{ ...inputStyle, fontSize: 12, textAlign: 'right', padding: '6px 8px' }}
                        type="number" placeholder="0" min="0" step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, 'quantity', e.target.value)} />
                    </td>
                    <td style={{ ...poTdStyle, textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                      {unitLabel}
                    </td>
                    <td style={poTdStyle}>
                      <input style={{ ...inputStyle, fontSize: 12, textAlign: 'right', padding: '6px 8px' }}
                        type="number" placeholder="0" min="0" step="1"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.id, 'unitCost', e.target.value)} />
                    </td>
                    <td style={poTdStyle}>
                      <input style={{ ...inputStyle, fontSize: 12, textAlign: 'center', padding: '6px 8px' }}
                        type="number" placeholder="0" min="0" max="100"
                        value={line.taxRate}
                        onChange={(e) => updateLine(line.id, 'taxRate', e.target.value)} />
                    </td>
                    <td style={poTdStyle}>
                      <input style={{ ...inputStyle, fontSize: 12, textAlign: 'center', padding: '6px 8px' }}
                        type="number" placeholder="0" min="0" max="100"
                        value={line.discount}
                        onChange={(e) => updateLine(line.id, 'discount', e.target.value)} />
                    </td>
                    <td style={{ ...poTdStyle, textAlign: 'right', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {lineTotal > 0 ? formatCOP(lineTotal) : '—'}
                    </td>
                    <td style={{ ...poTdStyle, textAlign: 'center' }}>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(line.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: 2 }}
                          title="Eliminar">×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'color-mix(in srgb, var(--pos) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--pos) 25%, transparent)',
        borderRadius: 8, padding: '10px 14px',
        fontSize: 12.5, color: 'var(--pos)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15 }}>✓</span>
        Recibir productos crea movimientos de entrada de inventario automáticamente.
      </div>

      {/* Notes + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'start' }}>
        <div>
          <Field label="Notas">
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="—" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px', fontSize: 13,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Resumen
          </div>
          {[
            ['Subtotal', formatCOP(subtotal)],
            ['IVA', formatCOP(totalTax)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--text-2)', fontSize: 12.5 }}>
              <span>{label}</span><span>{value}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            <span>Total</span><span>{formatCOP(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--neg)', fontWeight: 600, fontSize: 12 }}>
            <span>Saldo pendiente</span><span>{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16,
        borderTop: '1px solid var(--border)', marginTop: 8,
      }}>
        <Button variant="ghost" onClick={closeDrawer} disabled={saving}>Cancelar</Button>
        <Button variant="ghost" loading={saving} onClick={() => handleAction('draft')}>Guardar borrador</Button>
        <Button variant="primary" loading={saving} onClick={() => handleAction('confirm')}>Confirmar orden</Button>
      </div>
    </div>
  )
}

// ── Sale Form ────────────────────────────────────────────────────────────────

function SaleForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]
  const [lines, setLines] = useState([{ id: 1 }])

  return (
    <>
      <FormSection title={t.sec_general}>
        <Field label={t.f_customer}>
          <input style={inputStyle} type="text" placeholder="Restaurante Mar y Sol" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t.f_sale_date}>
            <input style={inputStyle} type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label={t.f_payment_method}>
            <select style={selectStyle}>
              <option>Transferencia</option>
              <option>Efectivo</option>
              <option>Tarjeta</option>
            </select>
          </Field>
        </div>
      </FormSection>
      <FormSection title="Productos">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.f_product}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.f_qty}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.f_unit_price}</div>
        </div>
        {lines.map((line) => (
          <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
            <input style={inputStyle} type="text" placeholder="Nombre del producto" />
            <input style={inputStyle} type="number" placeholder="0.0" />
            <input style={inputStyle} type="number" placeholder="0" />
          </div>
        ))}
        <Button variant="dashed" size="sm" onClick={() => setLines((l) => [...l, { id: Date.now() }])} style={{ marginTop: 4 }}>
          + {t.btn_add_line}
        </Button>
      </FormSection>
      <DrawerFooter onClose={closeDrawer} saveLabel={t.btn_save} cancelLabel={t.btn_cancel} drawerType="sale" />
    </>
  )
}

// ── Invoice Form ──────────────────────────────────────────────────────────────

function InvoiceForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  return (
    <>
      <FormSection title={t.sec_general}>
        <Field label={t.f_customer}>
          <input style={inputStyle} type="text" placeholder="Hotel Playa Grande" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t.f_issue_date}>
            <input style={inputStyle} type="date" defaultValue={today} />
          </Field>
          <Field label={t.f_due_date}>
            <input style={inputStyle} type="date" defaultValue={due} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Ítems">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.th_description}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.f_qty}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{t.f_amount}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <input style={inputStyle} type="text" placeholder="Producto o servicio" />
          <input style={inputStyle} type="number" placeholder="1" />
          <input style={inputStyle} type="number" placeholder="0" />
        </div>
      </FormSection>
      <DrawerFooter onClose={closeDrawer} saveLabel={t.btn_save} cancelLabel={t.btn_cancel} drawerType="invoice" />
    </>
  )
}

// ── Expense Form ──────────────────────────────────────────────────────────────

function ExpenseForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]

  return (
    <>
      <FormSection title={t.sec_general}>
        <Field label={t.f_date}>
          <input style={inputStyle} type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label={t.ef_category}>
          <select style={selectStyle}>
            <option>{t.ecat_payroll}</option>
            <option>{t.ecat_supplies}</option>
            <option>{t.ecat_utilities}</option>
            <option>{t.ecat_rent}</option>
            <option>{t.ecat_logistics}</option>
            <option>{t.ecat_maintenance}</option>
            <option>{t.ecat_other}</option>
          </select>
        </Field>
        <Field label={t.f_vendor}>
          <input style={inputStyle} type="text" placeholder="TransFrio S.L." />
        </Field>
        <Field label={t.th_description}>
          <input style={inputStyle} type="text" placeholder="Descripción..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t.f_amount}>
            <input style={inputStyle} type="number" placeholder="0" />
          </Field>
          <Field label={t.f_payment_method}>
            <select style={selectStyle}>
              <option>Transferencia</option>
              <option>Efectivo</option>
              <option>Tarjeta</option>
              <option>Débito automático</option>
            </select>
          </Field>
        </div>
        <Field label={t.f_notes}>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Opcional..." />
        </Field>
      </FormSection>
      <DrawerFooter onClose={closeDrawer} saveLabel={t.btn_save} cancelLabel={t.btn_cancel} drawerType="expense" />
    </>
  )
}

// ── Close Register Form ────────────────────────────────────────────────────────

function CloseRegisterForm() {
  const { lang, closeDrawer } = useAppStore()
  const t = translations[lang]
  const [counted, setCounted] = useState('')
  const expected = 2196.00
  const diff = counted ? parseFloat(counted) - expected : 0

  return (
    <>
      <div style={{
        background: 'var(--warn-bg)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warn)', marginBottom: 4 }}>Sesión #CS-2026-156</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.cash_openedby}</div>
      </div>
      <FormSection title={t.sec_general}>
        <Field label={t.cr_expected}>
          <input style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--muted)', cursor: 'not-allowed' }}
            type="text" value={formatCOP(expected)} readOnly />
        </Field>
        <Field label={t.cr_counted}>
          <input style={inputStyle} type="number" placeholder="0" value={counted}
            onChange={(e) => setCounted(e.target.value)} />
        </Field>
        {counted && (
          <Field label={t.cr_difference}>
            <input
              style={{ ...inputStyle, background: 'var(--bg)', color: diff >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600, cursor: 'not-allowed' }}
              type="text" value={`${diff >= 0 ? '+' : ''}${formatCOP(Math.abs(diff))}`} readOnly />
          </Field>
        )}
        <Field label={t.cr_notes}>
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} placeholder="Observaciones de cierre..." />
        </Field>
      </FormSection>
      <DrawerFooter onClose={closeDrawer} saveLabel={t.btn_close_register} cancelLabel={t.btn_cancel}
        danger drawerType="closeRegister" />
    </>
  )
}

// ── Drawer Footer ──────────────────────────────────────────────────────────────

const drawerToastMessages: Record<string, string> = {
  product:       'Producto creado',
  supplier:      'Proveedor guardado',
  po:            'Recepción registrada — stock actualizado',
  sale:          'Venta registrada',
  invoice:       'Factura generada',
  expense:       'Gasto registrado',
  closeRegister: 'Caja cerrada',
}

function DrawerFooter({ onClose, saveLabel, cancelLabel, danger, drawerType, onSave }: {
  onClose: () => void
  saveLabel: string
  cancelLabel: string
  danger?: boolean
  drawerType?: string
  onSave?: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (onSave) {
        await onSave()
      } else {
        await new Promise((res) => setTimeout(res, 1200))
      }
      setSaving(false)
      setSaved(true)
      toast(drawerToastMessages[drawerType ?? ''] ?? 'Guardado', danger ? 'info' : 'success')
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 900)
    } catch (err: unknown) {
      setSaving(false)
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Ocurrió un error')
      toast(msg, 'error')
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 10, justifyContent: 'flex-end',
      paddingTop: 16, borderTop: '1px solid var(--border)',
      marginTop: 8, marginBottom: 22,
    }}>
      <Button variant="ghost" onClick={onClose} disabled={saving}>{cancelLabel}</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={saving} success={saved} onClick={handleSave}>
        {saveLabel}
      </Button>
    </div>
  )
}

// ── Drawer shell ───────────────────────────────────────────────────────────────

const drawerTitleKeys: Record<string, 'btn_new_product' | 'btn_new_po' | 'btn_new_sale' | 'btn_new_invoice' | 'btn_new_expense' | 'btn_close_register' | 'btn_new_supplier'> = {
  product:       'btn_new_product',
  supplier:      'btn_new_supplier',
  po:            'btn_new_po',
  sale:          'btn_new_sale',
  invoice:       'btn_new_invoice',
  expense:       'btn_new_expense',
  closeRegister: 'btn_close_register',
}

export function Drawer() {
  const { drawerType, closeDrawer, lang } = useAppStore()
  const t = translations[lang]

  if (!drawerType) return null

  const titleKey = drawerTitleKeys[drawerType]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={closeDrawer}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', animation: 'overlayIn 0.2s ease' }} />

      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: drawerType === 'po' ? 860 : 520,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {t[titleKey]}
          </div>
          <Button variant="ghost" className="btn-icon-sm" onClick={closeDrawer} title="Cerrar">
            <XIcon />
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 0' }}>
          {drawerType === 'product'       && <ProductForm />}
          {drawerType === 'supplier'      && <SupplierForm />}
          {drawerType === 'po'            && <POForm />}
          {drawerType === 'sale'          && <SaleForm />}
          {drawerType === 'invoice'       && <InvoiceForm />}
          {drawerType === 'expense'       && <ExpenseForm />}
          {drawerType === 'closeRegister' && <CloseRegisterForm />}
        </div>
      </div>
    </div>
  )
}
