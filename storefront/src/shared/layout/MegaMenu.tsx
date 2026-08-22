import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { MEGA_COLUMNS, MEGA_FEATURED, slugify } from './megaMenuData'
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
  return (
    <div id={id} className={styles.panel}>
      <Container>
        <div className={styles.inner}>
          {MEGA_COLUMNS.map(column => (
            <div key={column.heading} className={styles.column}>
              <h3 className={styles.heading}>{column.heading}</h3>
              <ul>
                {column.links.map(label => (
                  <li key={label}>
                    <Link
                      to={`/productos/${slugify(label)}`}
                      className={styles.link}
                      onClick={onNavigate}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              {column.seeAllHref && (
                <Link to={column.seeAllHref} className={styles.seeAll} onClick={onNavigate}>
                  Ver todos →
                </Link>
              )}
            </div>
          ))}

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
