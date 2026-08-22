import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { NextIcon, PrevIcon } from '../../../shared/components/ui-icons'
import { ProductCard } from '../../catalog/ProductCard'
import { storeApi } from '../../../api/storeApi'
import styles from './Featured.module.css'

/** Los cuatro primeros por webSortOrder. Vienen del catálogo, no del código. */
export function Featured() {
  const trackRef = useRef<HTMLDivElement>(null)
  const { data: catalog } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => storeApi.getCatalog(),
  })

  const featured = [...(catalog?.products ?? [])]
    .sort((a, b) => a.webSortOrder - b.webSortOrder)
    .slice(0, 4)

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
          <h2 id="destacados-title">Lo que más sale esta semana</h2>
          <Link to="/productos" className={styles.seeAll}>Ver todo →</Link>
        </div>

        <div className={styles.viewport}>
          <div className={styles.track} ref={trackRef}>
            {featured.map(product => (
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
