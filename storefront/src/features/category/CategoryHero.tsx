import { Link } from 'react-router-dom'
import { Container } from '../../shared/components/Container'
import { Photo } from '../../shared/components/Photo'
import type { Breadcrumb, CategoryHero as Hero } from '../../api/types'
import styles from './CategoryHero.module.css'

interface Props {
  hero: Hero
  breadcrumbs: Breadcrumb[]
  /** Foto del primer producto: sirve de respaldo cuando no se cargó banner. */
  fallbackImage?: string | null
}

/**
 * Portada de la categoría. El título y el copy vienen de datos, no del código:
 * cambiarlos no debería exigir un despliegue.
 *
 * Alto contenido, no fijo: ocupa lo que necesita el texto en vez de robar una
 * pantalla entera antes de que se vea un solo producto.
 */
export function CategoryHero({ hero, breadcrumbs, fallbackImage }: Props) {
  const image = hero.bannerUrl ?? fallbackImage ?? null

  return (
    <header className={`${styles.hero} ${image ? '' : styles.plain}`}>
      {image && (
        /* La portada es lo primero que se ve: se descarga con prioridad, pero
           igual espera a estar entera antes de revelarse. */
        <Photo src={image} alt={hero.bannerAlt} priority ratio="auto" frameClassName={styles.image} />
      )}
      {image && <span className={styles.veil} aria-hidden="true" />}

      <Container className={styles.content}>
        <nav aria-label="Ruta de navegación" className={styles.crumbs}>
          {breadcrumbs.map((b, i) => (
            <span key={b.path} className={styles.crumb}>
              {i > 0 && <span className={styles.sep} aria-hidden="true">/</span>}
              {i === breadcrumbs.length - 1
                ? <span aria-current="page">{b.label}</span>
                : <Link to={b.path}>{b.label}</Link>}
            </span>
          ))}
        </nav>

        <h1 className={styles.title}>{hero.title}</h1>
        {hero.description && <p className={styles.lead}>{hero.description}</p>}
      </Container>
    </header>
  )
}
