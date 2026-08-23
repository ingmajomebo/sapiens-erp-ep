import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { Button } from '../../shared/components/Button'
import { Logo } from '../../shared/components/Logo'
import {
  CartIcon, DropdownIcon, ErrorIcon, GuaranteeIcon,
} from '../../shared/components/ui-icons'
import { formatPrice } from '../../shared/format'
import { calculateShipping } from '../../api/shipping'
import { COVERED_CITIES } from '../../content/coverage'
import { storeApi } from '../../api/storeApi'
import { InsufficientStockError, type PaymentMethod } from '../../api/types'
import { useCartStore, useCartSubtotal } from '../../store/useCartStore'
import { useCheckoutForm } from './useCheckoutForm'
import styles from './CheckoutPage.module.css'

/*
 * Las ciudades salen de la cobertura real, no de una lista suelta. Antes se
 * ofrecía Bogotá, Cali y Barranquilla, donde no entregamos: el cliente podía
 * terminar la compra y quedarse esperando.
 */
const CITIES = COVERED_CITIES.map(c => c.name)

const PAYMENT_OPTIONS: { id: PaymentMethod; title: string; text: string }[] = [
  { id: 'CASH_ON_DELIVERY', title: 'Contra entrega', text: 'Pagas en efectivo cuando recibas tu pedido.' },
  { id: 'BANK_TRANSFER', title: 'Transferencia', text: 'Al confirmar te mostramos los datos de Nequi y Bancolombia. Tu pedido se despacha cuando verifiquemos el pago.' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items, note, clear, removeItem } = useCartStore()
  const subtotal = useCartSubtotal()
  const { values, errors, setField, validateAll } = useCheckoutForm(note)
  const [outOfStock, setOutOfStock] = useState<InsufficientStockError | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const shippingCost = useMemo(
    () => (values.city ? calculateShipping(values.city, subtotal) : null),
    [values.city, subtotal],
  )
  const total = subtotal + (shippingCost ?? 0)

  const submit = useMutation({
    mutationFn: () => storeApi.createOrder({
      customer: {
        fullName: values.fullName.trim(),
        document: values.document.trim() || undefined,
        phone: values.phone.replace(/\D/g, ''),
        email: values.email.trim() || undefined,
      },
      shipping: {
        address: values.address.trim(),
        city: values.city.trim(),
        notes: values.notes.trim() || undefined,
      },
      paymentMethod: values.paymentMethod,
      // Solo identificadores y cantidades: nunca precios
      items: items.map(i => ({ presentationId: i.presentationId, quantity: i.quantity })),
      website: values.website,
    }),
    onSuccess: result => {
      clear()
      navigate(`/pedido/${result.trackingToken}`)
    },
    onError: err => {
      setOutOfStock(err instanceof InsufficientStockError ? err : null)
    },
  })

  if (items.length === 0 && !submit.isPending) {
    return (
      <Container>
        <div style={{ padding: '120px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-on-cream-muted)' }}>Tu carrito está vacío.</p>
          <div style={{ marginTop: 24 }}>
            <Link to="/productos" style={{ textDecoration: 'underline', textUnderlineOffset: 6 }}>
              Ver productos
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOutOfStock(null)
    if (!validateAll()) return
    submit.mutate()
  }

  const orderLines = (
    <>
      {items.map(item => (
        <div key={item.presentationId} className={styles.line}>
          <div className={styles.thumbWrap}>
            <img src={item.imageUrl || '/img/producto-pargo-rojo.jpg'} alt=""
              className={styles.thumb} width={56} height={56} />
            <span className={styles.badge}>{item.quantity}</span>
          </div>
          <div className={styles.lineInfo}>
            <div className={styles.lineName}>{item.productName}</div>
            <div className={styles.linePresentation}>{item.presentationName}</div>
          </div>
          <span className={styles.linePrice}>{formatPrice(item.unitPrice * item.quantity)}</span>
        </div>
      ))}
    </>
  )

  const totals = (
    <div className={styles.totals}>
      <div className={styles.totalRow}>
        <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
      </div>
      <div className={styles.totalRow}>
        <span>Envío</span>
        <span className={shippingCost === null ? styles.muted : undefined}>
          {shippingCost === null
            ? 'Ingresa tu ciudad'
            : shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
        </span>
      </div>
      <div className={styles.totalFinal}>
        <span>Total</span><span>{formatPrice(total)}</span>
      </div>
    </div>
  )

  return (
    <>
      <Helmet><title>Finalizar pedido · Encanto Pacífico</title></Helmet>

      <Container>
        {/* Cabecera propia: sin nav ni megamenú, para reducir la fuga */}
        <div className={styles.header}>
          <Link to="/" aria-label="Encanto Pacífico — volver al inicio"><Logo tone="oscuro" /></Link>
          <CartIcon />
        </div>

        <div className={styles.mobileSummary}>
          <button type="button" className={styles.mobileToggle}
            onClick={() => setSummaryOpen(v => !v)} aria-expanded={summaryOpen}>
            <span>Ver resumen del pedido · <b>{formatPrice(total)}</b></span>
            <DropdownIcon />
          </button>
          {summaryOpen && <div style={{ marginTop: 16 }}>{orderLines}{totals}</div>}
        </div>

        <div className={styles.layout}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <section className={styles.step}>
              <h2 className={styles.stepTitle}><span className={styles.stepNumber}>1</span>Tus datos</h2>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fullName">Nombre completo</label>
                <input id="fullName" className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                  value={values.fullName} onChange={e => setField('fullName', e.target.value)}
                  aria-invalid={!!errors.fullName} autoComplete="name" />
                {errors.fullName && <p className={styles.error}><ErrorIcon size={18} />{errors.fullName}</p>}
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">Teléfono</label>
                  <input id="phone" className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    value={values.phone} onChange={e => setField('phone', e.target.value)}
                    inputMode="tel" autoComplete="tel" placeholder="3001234567" />
                  {errors.phone && <p className={styles.error}><ErrorIcon size={18} />{errors.phone}</p>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="document">
                    Documento <span className={styles.optional}>(opcional)</span>
                  </label>
                  <input id="document" className={styles.input}
                    value={values.document} onChange={e => setField('document', e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Correo <span className={styles.optional}>(opcional, para enviarte el seguimiento)</span>
                </label>
                <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  value={values.email} onChange={e => setField('email', e.target.value)}
                  autoComplete="email" />
                {errors.email && <p className={styles.error}><ErrorIcon size={18} />{errors.email}</p>}
              </div>
            </section>

            <section className={styles.step}>
              <h2 className={styles.stepTitle}><span className={styles.stepNumber}>2</span>Entrega</h2>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="address">Dirección</label>
                <input id="address" className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                  value={values.address} onChange={e => setField('address', e.target.value)}
                  autoComplete="street-address" placeholder="Calle 10 #43-25, Apto 502" />
                {errors.address && <p className={styles.error}><ErrorIcon size={18} />{errors.address}</p>}
              </div>
              <div className={`${styles.row} ${styles.rowCity}`}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="city">Ciudad</label>
                  <input id="city" className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                    value={values.city} onChange={e => setField('city', e.target.value)}
                    list="ciudades" autoComplete="address-level2" />
                  <datalist id="ciudades">
                    {CITIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                  {errors.city && <p className={styles.error}><ErrorIcon size={18} />{errors.city}</p>}
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="notes">
                  Notas <span className={styles.optional}>(opcional)</span>
                </label>
                <textarea id="notes" className={`${styles.input} ${styles.textarea}`}
                  value={values.notes} onChange={e => setField('notes', e.target.value)}
                  placeholder="Portería recibe, timbre 502, día preferido…" />
              </div>
            </section>

            <section className={styles.step}>
              <h2 className={styles.stepTitle}><span className={styles.stepNumber}>3</span>Pago</h2>
              <div className={styles.payOptions}>
                {PAYMENT_OPTIONS.map(option => (
                  <button key={option.id} type="button"
                    className={`${styles.payOption} ${values.paymentMethod === option.id ? styles.payOptionSelected : ''}`}
                    aria-pressed={values.paymentMethod === option.id}
                    onClick={() => setField('paymentMethod', option.id)}>
                    <div>
                      <div className={styles.payTitle}>{option.title}</div>
                      <div className={styles.payText}>{option.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Honeypot: oculto sin display:none para que los bots lo rellenen */}
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="website">No completar</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off"
                value={values.website} onChange={e => setField('website', e.target.value)} />
            </div>

            <Button type="submit" variant="primary" fullWidth className={styles.submit}
              disabled={submit.isPending}>
              {submit.isPending ? 'Enviando…' : `Confirmar pedido · ${formatPrice(total)}`}
            </Button>

            {outOfStock && (
              <div className={styles.formError} role="alert">
                Nos quedamos sin <b>{outOfStock.productName} — {outOfStock.presentationName}</b> mientras
                armabas el pedido.
                <div className={styles.formErrorActions}>
                  <Button variant="secondary" onClick={() => {
                    removeItem(outOfStock.presentationId)
                    setOutOfStock(null)
                  }}>
                    Quitarlo y continuar
                  </Button>
                </div>
              </div>
            )}

            {submit.isError && !outOfStock && (
              <div className={styles.formError} role="alert">
                No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo:
                tus datos siguen aquí.
              </div>
            )}
          </form>

          <aside className={styles.summary}>
            <div className={styles.sticky}>
              {orderLines}

              <div className={styles.coupon}>
                <input className={`${styles.input} ${styles.couponInput}`}
                  placeholder="Código de descuento" disabled
                  title="Próximamente" aria-label="Código de descuento (próximamente)" />
                <Button variant="secondary" disabled aria-disabled>Aplicar</Button>
              </div>
              <p className={styles.couponHint}>Los códigos de descuento llegan pronto.</p>

              {totals}

              <div className={styles.guarantee}>
                <GuaranteeIcon className={styles.guaranteeIcon} />
                <div>
                  <div className={styles.guaranteeTitle}>Frescura garantizada</div>
                  <p className={styles.guaranteeText}>
                    Si tu pedido llega en mal estado, lo reponemos. Escríbenos el mismo día
                    que lo recibas.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </>
  )
}
