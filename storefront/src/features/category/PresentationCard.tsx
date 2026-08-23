import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { Photo } from '../../shared/components/Photo'
import { formatPrice } from '../../shared/format'
import { useCartStore } from '../../store/useCartStore'
import { AVAILABILITY_LABELS, type CatalogItem } from '../../api/types'
import styles from './PresentationCard.module.css'

/** Atributos que se muestran como etiqueta sobre la foto. */
const ETIQUETAS = 'etiqueta'

interface Props {
  item: CatalogItem
  /** Cuando está agotado, la tarjeta ofrece avisar en vez de comprar. */
  onNotifyMe?: (item: CatalogItem) => void
}

/**
 * Tarjeta de una presentación concreta. La foto manda: ocupa la mayor parte
 * y el texto se limita a lo que decide una compra.
 *
 * El hover cambia a la segunda foto SOLO si existe. Cuando no hay, no se
 * anima nada: una tarjeta que se mueve sin cambiar nada confunde.
 */
export function PresentationCard({ item, onNotifyMe }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const [hovering, setHovering] = useState(false)

  /* Sin existencias no es el fin de la venta: es una venta que toma más tiempo. */
  const sobrePedido = item.availability === 'OUT_OF_STOCK'
  const tieneSegunda = Boolean(item.secondaryImageUrl)
  const etiquetas = item.attributes[ETIQUETAS] ?? []
  /* La ficha por presentación llega en una etapa posterior; hasta entonces
     se entra por la familia, que ya resuelve y preselecciona presentación. */
  const href = `/productos/${item.groupSlug}`

  function comprar() {
    addItem({
      presentationId: item.id,
      productSlug: item.groupSlug,
      productName: item.groupName,
      presentationName: item.variantName,
      unitPrice: item.price,
      imageUrl: item.imageUrl ?? '',
    })
  }

  return (
    <article className={styles.card}>
      <Link
        to={href}
        className={styles.media}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label={`${item.groupName} — ${item.variantName}`}
      >
        {item.imageUrl && (
          <Photo
            src={item.imageUrl}
            alt={item.imageAlt}
            ratio="4 / 5"
            frameClassName={styles.frame}
            className={hovering && tieneSegunda ? styles.imageHidden : ''}
          />
        )}

        {tieneSegunda && (
          <Photo
            src={item.secondaryImageUrl!}
            alt=""
            ratio="4 / 5"
            frameClassName={`${styles.frame} ${styles.secondary} ${hovering ? styles.secondaryShown : ''}`}
          />
        )}

        {etiquetas.length > 0 && (
          <span className={styles.tags}>
            {etiquetas.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </span>
        )}


      </Link>

      <div className={styles.body}>
        {item.origin && <span className={styles.origin}>{item.origin}</span>}

        <h3 className={styles.name}>
          <Link to={href}>{item.groupName}</Link>
        </h3>

        <p className={styles.variant}>{item.variantName}</p>

        <p className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(item.price)}</span>
          {item.pricePerKg && (
            <span className={styles.perKg}>{formatPrice(item.pricePerKg)} / kg</span>
          )}
        </p>

        <p className={`${styles.stock} ${styles[item.availability.toLowerCase()]}`}>
          <span className={styles.dot} aria-hidden="true" />
          {AVAILABILITY_LABELS[item.availability]}
        </p>

        {sobrePedido && (
          <p className={styles.notice}>Te avisamos cuando tengamos existencias.</p>
        )}

        <div className={styles.action}>
          {sobrePedido ? (
            <Button variant="secondary" fullWidth onClick={() => onNotifyMe?.(item)}>
              Pedir sobre encargo
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={comprar}>
              Añadir al carrito
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
