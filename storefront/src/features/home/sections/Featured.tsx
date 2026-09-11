import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { NextIcon, PrevIcon } from '../../../shared/components/ui-icons'
import { ProductCard } from '../../catalog/ProductCard'
import { ProductCardSkeleton } from '../../catalog/ProductCardSkeleton'
import { storeApi } from '../../../api/storeApi'
import styles from './Featured.module.css'

/**
 * Los productos que más se venden, de las facturas reales.
 *
 * <p>Antes esta sección se titulaba "lo que más sale esta semana" y en realidad
 * mostraba los primeros por `webSortOrder`, un campo que alguien ordena a mano.
 * El texto afirmaba algo que el dato no respaldaba; ahora el orden sale de las
 * unidades facturadas.
 *
 * <p>Cuando todavía no hay ventas suficientes, el backend completa con el orden
 * de vitrina y avisa cuántos son de verdad. En ese caso el título cambia, en vez
 * de mentir sobre un producto recién publicado.
 */
export function Featured() {
  const trackRef = useRef<HTMLDivElement>(null)
  const { data, isPending } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: () => storeApi.getBestSellers(8),
  })

  const featured = data?.products ?? []
  const conVentas = data?.withRealSales ?? 0
  /* Con menos de la mitad respaldada por ventas, llamarlos "los más vendidos"
     sería propaganda: se anuncia como selección y punto. */
  const titulo = conVentas >= 4 ? 'Los más vendidos' : 'Nuestra selección'

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    track.scrollBy({ left: direction * ((card?.offsetWidth ?? 280) + 24), behavior: 'smooth' })
  }

  return (
    <Section tone="cream" aria-labelledby="destacados-title">
      <Container>
        <div className={styles.head}>
          <h2 id="destacados-title">{titulo}</h2>
          <Link to="/productos" className={styles.seeAll}>Ver todo →</Link>
        </div>

        {isPending && (
          <span className="sr-only" role="status" aria-live="polite">Cargando productos…</span>
        )}

        <div className={styles.viewport}>
          <div className={styles.track} ref={trackRef}>
            {/* El esqueleto va en el MISMO envoltorio que la tarjeta real: si
                midiera distinto, al llegar los datos el carrusel daría un salto
                y habríamos cambiado el problema de sitio en vez de quitarlo. */}
            {isPending
              ? Array.from({ length: 4 }, (_, i) => (
                <div key={`esqueleto-${i}`} className={styles.item}>
                  <ProductCardSkeleton />
                </div>
              ))
              : featured.map(product => (
                <div key={product.slug} className={styles.item}>
                  <ProductCard product={product} />
                </div>
              ))}
          </div>
        </div>

        <div className={styles.arrows}>
          <button type="button" className={styles.arrow}
            onClick={() => scrollByCard(-1)} aria-label="Ver productos anteriores">
            <PrevIcon />
          </button>
          <button type="button" className={styles.arrow}
            onClick={() => scrollByCard(1)} aria-label="Ver más productos">
            <NextIcon />
          </button>
        </div>
      </Container>
    </Section>
  )
}
