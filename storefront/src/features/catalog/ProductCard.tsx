import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../shared/components/Button'
import { formatPrice } from '../../shared/format'
import { useCartStore } from '../../store/useCartStore'
import type { Product } from '../../api/types'
import styles from './ProductCard.module.css'

/** Tarjeta de producto del catálogo y del carrusel de destacados. */
export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const addItem = useCartStore(s => s.addItem)

  const cheapest = [...product.presentations].sort((a, b) => a.price - b.price)[0]
  const hasOptions = product.presentations.length > 1
  const soldOut = !product.available

  function handleAction() {
    // Con más de una presentación la elección es del cliente, no nuestra
    if (hasOptions) { navigate(`/productos/${product.slug}`); return }
    addItem({
      presentationId: cheapest.id,
      productSlug: product.slug,
      productName: product.name,
      presentationName: cheapest.name,
      unitPrice: cheapest.price,
      imageUrl: product.imageUrl,
    })
  }

  return (
    <article className={styles.card}>
      <Link to={`/productos/${product.slug}`} className={styles.media} tabIndex={-1} aria-hidden="true">
        <img
          src={product.imageUrl}
          alt={product.imageAlt}
          width={1000} height={1250}
          loading="lazy"
          className={styles.image}
        />
        {soldOut && (
          <>
            <span className={styles.soldOutVeil} />
            <span className={styles.soldOutTag}>Agotado</span>
          </>
        )}
      </Link>

      <div className={styles.body}>
        <span className={styles.origin}>{product.origin}</span>
        <h3 className={styles.name}>
          <Link to={`/productos/${product.slug}`}>{product.name}</Link>
        </h3>
        <span className={styles.presentation}>{cheapest.name}</span>
        <span className={styles.price}>
          {hasOptions ? `desde ${formatPrice(cheapest.price)}` : formatPrice(cheapest.price)}
        </span>

        <div className={styles.action}>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleAction}
            disabled={soldOut}
            aria-disabled={soldOut}
          >
            {soldOut ? 'Agotado' : hasOptions ? 'Ver opciones' : 'Añadir al carrito'}
          </Button>
        </div>
      </div>
    </article>
  )
}
