import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../components/Container'
import { storeApi } from '../../api/storeApi'
import type { CategoryHero } from '../../api/types'
import { MEGA_FEATURED } from './megaMenuData'
import styles from './MegaMenu.module.css'

/** Subcategorías mínimas para que una categoría ocupe su propia columna. */
const MINIMO_PARA_COLUMNA = 3

interface MegaMenuProps {
  id: string
  onNavigate: () => void
}

/**
 * Panel de productos. Se monta solo cuando está abierto para que el foco
 * no entre en enlaces invisibles.
 */
export function MegaMenu({ id, onNavigate }: MegaMenuProps) {
  /*
   * El menú se construye con lo que hay publicado, no con una lista escrita a
   * mano: así no puede ofrecer un pescado que no existe ni esconder uno nuevo.
   * Comparte clave de caché con el resto de la tienda, así que abrir el panel
   * no dispara una petición extra.
   */
  const { data: portadas = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => storeApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  })

  const categorias = portadas.filter(c => c.kind === 'CATEGORY')
  const hijosDe = (slug: string) => portadas.filter(c => c.parentSlug === slug)

  /*
   * Una categoría con una sola subcategoría no merece una columna entera: seis
   * categorías desbordaban la rejilla y empujaban el destacado a una segunda
   * fila. Las pequeñas se apilan juntas y el menú vuelve a caber en una sola.
   */
  const principales = categorias.filter(c => hijosDe(c.slug).length >= MINIMO_PARA_COLUMNA)
  const menores = categorias.filter(c => hijosDe(c.slug).length < MINIMO_PARA_COLUMNA)
  const columnas = principales.length + (menores.length > 0 ? 1 : 0)

  return (
    <div id={id} className={styles.panel}>
      <Container>
        <div
          className={styles.inner}
          style={{ gridTemplateColumns: `repeat(${columnas}, 1fr) 1.15fr` }}
        >
          {principales.map(categoria => (
            <div key={categoria.slug} className={styles.column}>
              <Grupo categoria={categoria} hijos={hijosDe(categoria.slug)} onNavigate={onNavigate} />
            </div>
          ))}

          {menores.length > 0 && (
            <div className={styles.column}>
              {menores.map(categoria => (
                <div key={categoria.slug} className={styles.subgrupo}>
                  <Grupo
                    categoria={categoria}
                    hijos={hijosDe(categoria.slug)}
                    onNavigate={onNavigate}
                    compacto
                  />
                </div>
              ))}
            </div>
          )}

          <div className={styles.featured}>
            <Link to={MEGA_FEATURED.href} onClick={onNavigate}>
              <img
                src={MEGA_FEATURED.image}
                alt={MEGA_FEATURED.imageAlt}
                width={800}
                height={1000}
                loading="lazy"
                className={styles.featuredImage}
              />
            </Link>
            <span className={styles.featuredTag}>{MEGA_FEATURED.tag}</span>
            <div className={styles.featuredTitle}>{MEGA_FEATURED.title}</div>
            <Link to={MEGA_FEATURED.href} className={styles.featuredLink} onClick={onNavigate}>
              Ver producto →
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}

/** Una categoría con sus subcategorías. `compacto` omite el "Ver todos": en la
 *  columna compartida el propio encabezado ya lleva a la categoría. */
function Grupo({
  categoria, hijos, onNavigate, compacto = false,
}: {
  categoria: CategoryHero
  hijos: CategoryHero[]
  onNavigate: () => void
  compacto?: boolean
}) {
  return (
    <>
      <h3 className={styles.heading}>
        <Link to={`/${categoria.slug}`} className={styles.headingLink} onClick={onNavigate}>
          {categoria.title}
        </Link>
      </h3>
      <ul>
        {hijos.map(hijo => (
          <li key={hijo.slug}>
            <Link
              to={`/${categoria.slug}/${hijo.slug}`}
              className={styles.link}
              onClick={onNavigate}
            >
              {hijo.title}
            </Link>
          </li>
        ))}
      </ul>
      {!compacto && (
        <Link to={`/${categoria.slug}`} className={styles.seeAll} onClick={onNavigate}>
          Ver todos →
        </Link>
      )}
    </>
  )
}
