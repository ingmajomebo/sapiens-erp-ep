import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../shared/components/Button'
import {
  CloseIcon, DecreaseIcon, EmptyCartIcon, IncreaseIcon, RemoveIcon, ShippingIcon,
} from '../../shared/components/ui-icons'
import { formatPrice } from '../../shared/format'
import { COLD_CHAIN_MINIMUM, FREE_SHIPPING_THRESHOLD } from '../../api/shipping'
import { MAX_NOTE_LENGTH, MAX_UNITS_PER_LINE, useCartStore, useCartSubtotal } from '../../store/useCartStore'
import styles from './CartDrawer.module.css'

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { items, note, setQuantity, removeItem, setNote } = useCartStore()
  const subtotal = useCartSubtotal()
  const [showNote, setShowNote] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const unitCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const missingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  const belowColdChain = items.length > 0 && subtotal < COLD_CHAIN_MINIMUM

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input')
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  function goToCheckout() {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
      >
        <div className={styles.head}>
          <span className={styles.title}>Tu pedido</span>
          {unitCount > 0 && <span className={styles.count}>{unitCount}</span>}
          <button ref={closeRef} type="button" className={styles.close}
            onClick={onClose} aria-label="Cerrar el carrito">
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <EmptyCartIcon className={styles.emptyFish} aria-hidden="true" />
            <p className={styles.emptyText}>Tu carrito está vacío</p>
            <ButtonLink to="/productos" variant="secondary">Ver productos</ButtonLink>
          </div>
        ) : (
          <>
            <div className={styles.lines}>
              {items.map(item => (
                <div key={item.presentationId} className={styles.line}>
                  <img src={item.imageUrl || '/img/producto-pargo-rojo.jpg'} alt=""
                    className={styles.thumb} width={72} height={72} />
                  <div className={styles.info}>
                    <div className={styles.name}>{item.productName}</div>
                    <div className={styles.presentation}>{item.presentationName}</div>
                    <div className={styles.lineFoot}>
                      <div className={styles.stepper}>
                        <button type="button" className={styles.stepperButton}
                          onClick={() => setQuantity(item.presentationId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Quitar una unidad de ${item.productName}`}>
                          <DecreaseIcon />
                        </button>
                        <span className={styles.stepperValue}>{item.quantity}</span>
                        <button type="button" className={styles.stepperButton}
                          onClick={() => setQuantity(item.presentationId, item.quantity + 1)}
                          disabled={item.quantity >= MAX_UNITS_PER_LINE}
                          aria-label={`Añadir una unidad de ${item.productName}`}>
                          <IncreaseIcon />
                        </button>
                      </div>
                      <span className={styles.linePrice}>
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button type="button" className={styles.remove}
                    onClick={() => removeItem(item.presentationId)}
                    aria-label={`Eliminar ${item.productName} del carrito`}>
                    <RemoveIcon />
                  </button>
                </div>
              ))}

              {showNote ? (
                <>
                  <label htmlFor="cart-note" className="sr-only">
                    Nota o fecha de entrega preferida
                  </label>
                  <textarea
                    id="cart-note"
                    className={styles.noteArea}
                    value={note}
                    maxLength={MAX_NOTE_LENGTH}
                    placeholder="¿Cómo lo preparamos? ¿Qué día prefieres recibirlo?"
                    onChange={e => setNote(e.target.value)}
                  />
                  <div className={styles.noteCount}>{note.length}/{MAX_NOTE_LENGTH}</div>
                </>
              ) : (
                <button type="button" className={styles.noteToggle} onClick={() => setShowNote(true)}>
                  Agregar nota o fecha de entrega preferida
                </button>
              )}
            </div>

            <div className={styles.foot}>
              <div className={styles.progressLabel}>
                {missingForFree > 0 ? (
                  <>Te faltan <b>{formatPrice(missingForFree)}</b> para envío gratis</>
                ) : (
                  <><ShippingIcon /> Tienes envío gratis</>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${missingForFree === 0 ? styles.progressDone : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className={styles.subtotal}>
                <span className={styles.subtotalLabel}>Subtotal</span>
                <span className={styles.subtotalValue}>{formatPrice(subtotal)}</span>
              </div>

              <p className={`${styles.coldChain} ${belowColdChain ? styles.blocked : ''}`}>
                Los pedidos refrigerados deben sumar al menos {formatPrice(COLD_CHAIN_MINIMUM)} para
                conservar la cadena de frío en tránsito.
                {belowColdChain && ` Te faltan ${formatPrice(COLD_CHAIN_MINIMUM - subtotal)}.`}
              </p>

              <Button
                variant="primary"
                fullWidth
                className={styles.checkout}
                onClick={goToCheckout}
                disabled={belowColdChain}
                aria-disabled={belowColdChain}
              >
                Ir a pagar
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
