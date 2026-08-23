import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../components/Container'
import { storeApi } from '../../api/storeApi'
import { MEGA_FEATURED } from './megaMenuData'
import styles from './MegaMenu.module.css'

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

  return (
    <div id={id} className={styles.panel}>
      <Container>
        <div className={styles.inner}>
          {categorias.map(categoria => {
            const especies = portadas.filter(c => c.parentSlug === categoria.slug)
            return (
              <div key={categoria.slug} className={styles.column}>
                <h3 className={styles.heading}>
                  <Link to={`/${categoria.slug}`} className={styles.headingLink} onClick={onNavigate}>
                    {categoria.title}
                  </Link>
                </h3>
                <ul>
                  {especies.map(especie => (
                    <li key={especie.slug}>
                      <Link
                        to={`/${categoria.slug}/${especie.slug}`}
                        className={styles.link}
                        onClick={onNavigate}
                      >
                        {especie.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={`/${categoria.slug}`} className={styles.seeAll} onClick={onNavigate}>
                  Ver todos →
                </Link>
              </div>
            )
          })}

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
