import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { publicOrderApi, type PublicProductDto, type SalesOrderDto, type DeliveryMethod } from './api/salesApi'
import { productImageSrc } from '../catalog/api/productApi'
import { formatCOP } from '../../shared/currency'

/**
 * Canal público de pedidos (REQ-VEN-001) — storefront de La Pescadería.
 * Página standalone (sin autenticación) accesible en /pedido/{token}.
 * Los textos de contacto/horario del pie son placeholders a reemplazar por el negocio.
 */

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg', LB: 'lb', UNIT: 'ud', PACKAGE: 'paq', LITER: 'L',
}

const SEA_EMOJI = ['🐟', '🦐', '🦑', '🐙', '🦀', '🐚', '🦞', '🐠']
function emojiFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997
  return SEA_EMOJI[h % SEA_EMOJI.length]
}

const CSS = `
  .lp-page { min-height: 100vh; background: #F2F7F7; color: #0B2436;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased; }
  .lp-serif { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 400; }
  .lp-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; }

  .lp-hero { background: linear-gradient(168deg, #0B2436 0%, #0E3A4E 62%, #0E7C86 130%);
    color: #F2F7F7; padding: 26px 24px 0; position: relative; overflow: hidden; }
  .lp-hero-inner { max-width: 980px; margin: 0 auto; }
  .lp-hero h1 { font-size: clamp(34px, 6vw, 58px); line-height: 1.04; letter-spacing: -0.02em;
    font-weight: 800; margin: 22px 0 14px; }
  .lp-hero h1 em { color: #BFE0E2; }
  .lp-waves { display: block; width: 100%; margin-top: 40px; }

  .lp-ticker { background: #FF6B4A; color: #FFF6F0; overflow: hidden; white-space: nowrap;
    padding: 9px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
  .lp-ticker-track { display: inline-block; animation: lp-marquee 36s linear infinite; }
  @keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) {
    .lp-ticker-track { animation: none; }
    .lp-card, .lp-hero h1 { animation: none !important; }
  }

  .lp-section { max-width: 980px; margin: 0 auto; padding: 0 24px; }
  .lp-props { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 34px auto; }
  @media (max-width: 680px) { .lp-props { grid-template-columns: 1fr; } }

  .lp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
    gap: 16px; margin-top: 20px; }
  .lp-card { background: #fff; border: 1px solid #DCE8E9; border-radius: 14px; overflow: hidden;
    transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .lp-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(11,36,54,0.10); }
  .lp-card.lp-in-cart { border-color: #0E7C86; box-shadow: 0 0 0 2px rgba(14,124,134,0.18); }

  .lp-step-btn { width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid #0E7C86;
    background: #fff; color: #0E7C86; font-size: 17px; font-weight: 800; cursor: pointer;
    font-family: inherit; line-height: 1; }
  .lp-step-btn:hover { background: #0E7C86; color: #fff; }
  .lp-step-btn:focus-visible, .lp-cta:focus-visible, .lp-input:focus-visible { outline: 2px solid #FF6B4A; outline-offset: 2px; }

  .lp-input { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1.5px solid #DCE8E9;
    background: #fff; color: #0B2436; font-size: 14px; font-family: inherit; box-sizing: border-box; }
  .lp-input::placeholder { color: #7C97A3; }

  .lp-cta { background: #0E7C86; color: #fff; border: none; border-radius: 12px;
    padding: 14px 28px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit;
    letter-spacing: 0.01em; }
  .lp-cta:hover { background: #0A6570; }
  .lp-cta:disabled { opacity: 0.45; cursor: default; }

  .lp-cartbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
    background: #0B2436; color: #F2F7F7; padding: 13px 24px;
    display: flex; align-items: center; justify-content: center; gap: 18px;
    box-shadow: 0 -8px 30px rgba(11,36,54,0.35); }
`

// ─── Piezas ───────────────────────────────────────────────────────────────────

function Waves({ fill }: { fill: string }) {
  return (
    <svg className="lp-waves" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true" style={{ height: 54 }}>
      <path d="M0,40 C240,80 480,0 720,30 C960,60 1200,10 1440,40 L1440,70 L0,70 Z" fill={fill} />
    </svg>
  )
}

function Prop({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #DCE8E9', borderRadius: 14, padding: '20px 20px 18px' }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: '#E7F3F4', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12,
      }}>{icon}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#4A6572', lineHeight: 1.55 }}>{text}</div>
    </div>
  )
}

function ProductCard({ product, qty, onChange }: {
  product: PublicProductDto
  qty: number
  onChange: (next: number) => void
}) {
  const img = productImageSrc(product.imageUrl)
  const unit = UNIT_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure
  return (
    <div className={`lp-card${qty > 0 ? ' lp-in-cart' : ''}`}>
      <div style={{
        height: 128, background: 'linear-gradient(150deg, #DCEDEE 0%, #BFE0E2 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {img
          ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 46, filter: 'saturate(0.9)' }} aria-hidden="true">{emojiFor(product.name)}</span>}
        <span style={{
          position: 'absolute', top: 10, left: 10, background: '#FF6B4A', color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 20,
        }}>FRESCO HOY</span>
      </div>
      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{product.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '5px 0 13px' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#0E7C86' }}>{formatCOP(product.salePrice)}</span>
          <span className="lp-serif" style={{ fontSize: 12.5, color: '#4A6572' }}>el {unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="lp-step-btn" aria-label={`Quitar ${product.name}`}
            onClick={() => onChange(Math.max(0, qty - 0.5))}>−</button>
          <div style={{
            flex: 1, textAlign: 'center', fontSize: 14.5, fontWeight: 800,
            color: qty > 0 ? '#0B2436' : '#7C97A3',
          }}>
            {qty > 0 ? `${qty} ${unit}` : `0 ${unit}`}
          </div>
          <button className="lp-step-btn" aria-label={`Añadir ${product.name}`}
            onClick={() => onChange(qty + 0.5)}>+</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PublicOrderPage({ token }: { token: string }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [confirmed, setConfirmed] = useState<SalesOrderDto | null>(null)
  const orderRef = useRef<HTMLDivElement>(null)
  const catalogRef = useRef<HTMLDivElement>(null)

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
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress.trim() : undefined,
      lines: Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    }),
    onSuccess: order => { setConfirmed(order); window.scrollTo({ top: 0 }) },
  })

  const selected = useMemo(() =>
    Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ product: catalog?.products.find(p => p.id === id), qty: q }))
      .filter((s): s is { product: PublicProductDto; qty: number } => !!s.product),
    [quantities, catalog])

  const total = selected.reduce((acc, s) => acc + s.product.salePrice * s.qty, 0)

  // ── Estados terminales ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="lp-page" style={{ display: 'grid', placeItems: 'center' }}>
        <style>{CSS}</style>
        <div style={{ color: '#4A6572', fontSize: 14 }}>Preparando el género de hoy…</div>
      </div>
    )
  }

  if (isError || !catalog) {
    return (
      <div className="lp-page" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <style>{CSS}</style>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>⚓</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Este enlace de pedido no es válido o fue desactivado</div>
          <div style={{ fontSize: 14, color: '#4A6572', marginTop: 10, lineHeight: 1.6 }}>
            Pide a la pescadería un enlace actualizado y vuelve a intentarlo.
          </div>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="lp-page">
        <style>{CSS}</style>
        <div className="lp-hero" style={{ paddingBottom: 0 }}>
          <div className="lp-hero-inner" style={{ textAlign: 'center', padding: '30px 0 10px' }}>
            <div className="lp-eyebrow" style={{ color: '#BFE0E2' }}>La Pescadería · pedido recibido</div>
            <h1 style={{ margin: '18px 0 10px' }}>¡Marchando<em className="lp-serif">!</em></h1>
            <div style={{ fontSize: 15.5, color: '#BFE0E2', lineHeight: 1.6 }}>
              Tu pedido <b style={{ color: '#fff' }}>{confirmed.orderNumber}</b> ya está en la pizarra.<br />
              Te contactaremos para confirmar la recogida o entrega.
            </div>
          </div>
          <Waves fill="#F2F7F7" />
        </div>
        <div className="lp-section" style={{ maxWidth: 520, paddingTop: 26, paddingBottom: 60 }}>
          <div style={{ background: '#fff', border: '1px solid #DCE8E9', borderRadius: 16, padding: '20px 24px' }}>
            <div className="lp-eyebrow" style={{ color: '#0E7C86', marginBottom: 12 }}>Resumen</div>
            {confirmed.lines.map(l => (
              <div key={l.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0' }}>
                <span>{l.productName} <span className="lp-serif" style={{ color: '#4A6572' }}>× {l.quantity}</span></span>
                <span style={{ fontWeight: 700 }}>{formatCOP(l.lineTotal)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
              borderTop: '2px solid #0B2436', marginTop: 10, paddingTop: 12,
            }}>
              <span>Total estimado</span><span style={{ color: '#0E7C86' }}>{formatCOP(confirmed.total)}</span>
            </div>
            <div className="lp-serif" style={{ fontSize: 12.5, color: '#4A6572', marginTop: 10 }}>
              El importe final se ajusta al peso exacto en mostrador.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Storefront ─────────────────────────────────────────────────────────────
  const tickerItems = catalog.products.map(p =>
    `${emojiFor(p.name)} ${p.name.toUpperCase()} · ${formatCOP(p.salePrice)}/${UNIT_LABELS[p.unitOfMeasure] ?? ''}`)
  const ticker = tickerItems.length > 0 ? tickerItems.join('   ✦   ') + '   ✦   ' : ''

  return (
    <div className="lp-page" style={{ paddingBottom: selected.length > 0 ? 80 : 0 }}>
      <style>{CSS}</style>

      {/* Hero: la pizarra de la lonja */}
      <header className="lp-hero">
        <div className="lp-hero-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 22 }} aria-hidden="true">🐟</span>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.12em' }}>LA PESCADERÍA</span>
            </div>
            <span className="lp-eyebrow" style={{ color: '#BFE0E2' }}>
              {catalog.label ?? 'Pedidos en línea'}
            </span>
          </div>

          <h1>
            Del mar a tu mesa,<br />
            <em className="lp-serif">el mismo día.</em>
          </h1>
          <p style={{ fontSize: 16, color: '#BFE0E2', maxWidth: 480, lineHeight: 1.65, margin: '0 0 26px' }}>
            Cada mañana elegimos el mejor género de la lonja. Pide ahora y
            te lo preparamos como tú quieras: limpio, fileteado o en rodajas.
          </p>
          <button className="lp-cta" style={{ background: '#FF6B4A', marginBottom: 8 }}
            onClick={() => catalogRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Ver el género de hoy ↓
          </button>
        </div>
        <Waves fill="#F2F7F7" />
      </header>

      {/* Ticker de precios de la lonja */}
      {ticker && (
        <div className="lp-ticker" role="marquee" aria-label="Precios de hoy">
          <div className="lp-ticker-track">
            <span>{ticker}</span><span aria-hidden="true">{ticker}</span>
          </div>
        </div>
      )}

      {/* Propuesta de valor */}
      <div className="lp-section">
        <div className="lp-props">
          <Prop icon="⚓" title="Recibido de lonja a diario"
            text="Compramos cada madrugada en la lonja. Lo que ves es lo que ha llegado hoy." />
          <Prop icon="🔪" title="Preparado a tu gusto"
            text="Indícanos en las notas cómo lo quieres: entero, limpio, en filetes o en rodajas." />
          <Prop icon="🛵" title="Recogida o entrega hoy"
            text="Confirmamos tu pedido por teléfono y lo tienes listo el mismo día." />
        </div>
      </div>

      {/* Género del día */}
      <div className="lp-section" ref={catalogRef} style={{ paddingTop: 6 }}>
        <div className="lp-eyebrow" style={{ color: '#FF6B4A' }}>El género de hoy</div>
        <h2 style={{ fontSize: 27, fontWeight: 800, margin: '8px 0 0', letterSpacing: '-0.01em' }}>
          Elige y dinos <em className="lp-serif" style={{ fontWeight: 400 }}>cuánto</em>
        </h2>
        <div className="lp-grid">
          {catalog.products.map(p => (
            <ProductCard key={p.id} product={p} qty={quantities[p.id] ?? 0}
              onChange={next => setQuantities(prev => ({ ...prev, [p.id]: next }))} />
          ))}
        </div>
        {catalog.products.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4A6572', padding: 40 }}>
            Hoy no hay género publicado. Vuelve a intentarlo más tarde.
          </div>
        )}
      </div>

      {/* Tu pedido */}
      <div className="lp-section" ref={orderRef} style={{ maxWidth: 620, padding: '44px 24px 30px' }}>
        <div className="lp-eyebrow" style={{ color: '#FF6B4A' }}>Tu pedido</div>
        <h2 style={{ fontSize: 27, fontWeight: 800, margin: '8px 0 16px', letterSpacing: '-0.01em' }}>
          Revisa y envía
        </h2>

        <div style={{ background: '#fff', border: '1px solid #DCE8E9', borderRadius: 16, padding: '20px 24px' }}>
          {selected.length === 0 ? (
            <div style={{ fontSize: 14, color: '#4A6572', padding: '6px 0' }}>
              Aún no has elegido nada — añade género con los botones <b>+</b> de arriba.
            </div>
          ) : (
            <>
              {selected.map(({ product, qty }) => (
                <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '6px 0' }}>
                  <span>{product.name} <span className="lp-serif" style={{ color: '#4A6572' }}>× {qty} {UNIT_LABELS[product.unitOfMeasure] ?? ''}</span></span>
                  <span style={{ fontWeight: 700 }}>{formatCOP(product.salePrice * qty)}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
                borderTop: '2px solid #0B2436', marginTop: 10, paddingTop: 12, marginBottom: 6,
              }}>
                <span>Total estimado</span><span style={{ color: '#0E7C86' }}>{formatCOP(total)}</span>
              </div>
            </>
          )}

          {/* ¿Cómo lo recibes? */}
          <div style={{ fontSize: 13, fontWeight: 800, margin: '18px 0 10px' }}>¿Cómo lo recibes?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([['PICKUP', '🏪 Recojo en el local'], ['DELIVERY', '🛵 Envío a domicilio']] as [DeliveryMethod, string][]).map(([m, label]) => (
              <button key={m} type="button" onClick={() => setDeliveryMethod(m)}
                style={{
                  flex: 1, padding: '12px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13.5, fontWeight: deliveryMethod === m ? 800 : 600,
                  border: deliveryMethod === m ? '2px solid #0E7C86' : '1.5px solid #DCE8E9',
                  background: deliveryMethod === m ? '#E7F3F4' : '#fff', color: '#0B2436',
                }}>
                {label}
              </button>
            ))}
          </div>
          {deliveryMethod === 'DELIVERY' && (
            <input className="lp-input" style={{ marginTop: 10 }} placeholder="Dirección de entrega *"
              value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <input className="lp-input" placeholder="Tu nombre" value={contactName} onChange={e => setContactName(e.target.value)} />
            <input className="lp-input" placeholder="Teléfono" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            <input className="lp-input" style={{ gridColumn: '1 / -1' }} type="email" placeholder="Email (opcional)" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            <textarea className="lp-input" style={{ gridColumn: '1 / -1', minHeight: 62, resize: 'vertical' }}
              placeholder="¿Cómo lo preparamos? ¿A qué hora pasas a recogerlo?"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button className="lp-cta" style={{ width: '100%', marginTop: 14 }}
            disabled={selected.length === 0 || submitMut.isPending}
            onClick={() => submitMut.mutate()}>
            {submitMut.isPending ? 'Enviando…' : `Enviar pedido · ${formatCOP(total)}`}
          </button>
          {submitMut.isError && (
            <div style={{ color: '#C2402A', fontSize: 13, marginTop: 10 }}>
              No se pudo enviar el pedido. Revisa las cantidades e inténtalo de nuevo.
            </div>
          )}
        </div>
      </div>

      {/* Pie (placeholders del negocio) */}
      <footer style={{ background: '#0B2436', color: '#BFE0E2', marginTop: 30 }}>
        <div className="lp-section" style={{ padding: '30px 24px 34px', display: 'flex', flexWrap: 'wrap', gap: 26, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#fff', letterSpacing: '0.12em', marginBottom: 8 }}>🐟 LA PESCADERÍA</div>
            <div className="lp-serif" style={{ fontSize: 13.5 }}>Género de lonja desde 1987</div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            Calle del Puerto, 12 · Mercado Central<br />
            Lunes a sábado · 8:00 – 15:00<br />
            +34 600 000 000
          </div>
        </div>
      </footer>

      {/* Barra de carrito fija */}
      {selected.length > 0 && (
        <div className="lp-cartbar">
          <span style={{ fontSize: 14 }}>
            <b>{selected.length}</b> producto{selected.length !== 1 ? 's' : ''} · <b style={{ color: '#BFE0E2' }}>{formatCOP(total)}</b>
          </span>
          <button className="lp-cta" style={{ background: '#FF6B4A', padding: '10px 20px', fontSize: 14 }}
            onClick={() => orderRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Revisar pedido →
          </button>
        </div>
      )}
    </div>
  )
}
