import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { publicOrderApi, type SalesOrderDto } from './api/salesApi'
import { productImageSrc } from '../catalog/api/productApi'

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg', LB: 'lb', UNIT: 'ud', PACKAGE: 'pkg', LITER: 'L',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box',
}

/**
 * Canal público de pedidos (REQ-VEN-001): página sin autenticación accesible en
 * /pedido/{token}. El token lo genera y administra la empresa desde el panel de Ventas.
 */
export function PublicOrderPage({ token }: { token: string }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState<SalesOrderDto | null>(null)

  const { data: catalog, isLoading, isError } = useQuery({
    queryKey: ['public-catalog', token],
    queryFn: () => publicOrderApi.catalog(token),
    retry: false,
  })

  const submitMut = useMutation({
    mutationFn: () => publicOrderApi.create(token, {
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      lines: Object.entries(quantities)
        .map(([productId, qty]) => ({ productId, quantity: parseFloat(qty) }))
        .filter(l => l.quantity > 0),
    }),
    onSuccess: order => setConfirmed(order),
  })

  const selectedLines = Object.entries(quantities).filter(([, q]) => parseFloat(q) > 0)
  const total = selectedLines.reduce((acc, [id, q]) => {
    const p = catalog?.products.find(pr => pr.id === id)
    return acc + (p ? p.salePrice * parseFloat(q) : 0)
  }, 0)

  const shell: React.CSSProperties = {
    minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
    display: 'flex', justifyContent: 'center', padding: '32px 16px',
    fontFamily: 'inherit',
  }

  if (isLoading) {
    return <div style={shell}><div style={{ color: 'var(--muted)', paddingTop: 80 }}>Cargando catálogo…</div></div>
  }

  if (isError || !catalog) {
    return (
      <div style={shell}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Este enlace de pedido no es válido o fue desactivado</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>Contacta con la empresa para obtener un enlace actualizado.</div>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div style={shell}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>¡Pedido recibido!</div>
          <div style={{ fontSize: 14.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            Tu número de pedido es <b style={{ color: 'var(--accent-text)' }}>{confirmed.orderNumber}</b>.
            <br />La empresa lo revisará y se pondrá en contacto contigo para confirmarlo.
          </div>
          <div style={{
            marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px', textAlign: 'left',
          }}>
            {confirmed.lines.map(l => (
              <div key={l.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0' }}>
                <span>{l.productName} × {l.quantity}</span>
                <span style={{ fontWeight: 600 }}>€{l.lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 800, borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 10 }}>
              <span>Total estimado</span><span>€{confirmed.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🐟</div>
          <div style={{ fontSize: 21, fontWeight: 800 }}>Haz tu pedido</div>
          {catalog.label && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{catalog.label}</div>}
        </div>

        {/* Catálogo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {catalog.products.map(p => {
            const img = productImageSrc(p.imageUrl)
            const qty = quantities[p.id] ?? ''
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface)', border: `1px solid ${parseFloat(qty) > 0 ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 16px',
              }}>
                {img ? (
                  <img src={img} alt={p.name} style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 46, height: 46, borderRadius: 8, flexShrink: 0, background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>🐟</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    €{p.salePrice.toFixed(2)} / {UNIT_LABELS[p.unitOfMeasure] ?? p.unitOfMeasure}
                  </div>
                </div>
                <input
                  type="number" min="0" step="0.5" placeholder="0"
                  value={qty}
                  onChange={e => setQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                  style={{ ...inputStyle, width: 86, textAlign: 'center' }}
                />
              </div>
            )
          })}
          {catalog.products.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No hay productos disponibles.</div>
          )}
        </div>

        {/* Datos de contacto (opcionales: el pedido anónimo es válido) */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Tus datos (opcional)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={inputStyle} placeholder="Nombre" value={contactName} onChange={e => setContactName(e.target.value)} />
            <input style={inputStyle} placeholder="Teléfono" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            <input style={{ ...inputStyle, gridColumn: '1 / -1' }} placeholder="Email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            <textarea style={{ ...inputStyle, gridColumn: '1 / -1', minHeight: 56, resize: 'vertical' }}
              placeholder="Notas para la empresa (horario de recogida, preferencias…)"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Enviar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Total estimado: <span style={{ color: 'var(--accent-text)' }}>€{total.toFixed(2)}</span>
          </div>
          <button
            disabled={selectedLines.length === 0 || submitMut.isPending}
            onClick={() => submitMut.mutate()}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
              padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: selectedLines.length === 0 || submitMut.isPending ? 0.5 : 1,
            }}
          >
            {submitMut.isPending ? 'Enviando…' : `Enviar pedido (${selectedLines.length})`}
          </button>
        </div>
        {submitMut.isError && (
          <div style={{ color: 'var(--neg)', fontSize: 13, marginTop: 10, textAlign: 'right' }}>
            No se pudo enviar el pedido. Revisa las cantidades e inténtalo de nuevo.
          </div>
        )}
      </div>
    </div>
  )
}
