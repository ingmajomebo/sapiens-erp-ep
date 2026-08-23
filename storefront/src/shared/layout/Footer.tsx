import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { Logo } from '../components/Logo'
import { FacebookIcon, InstagramIcon, WhatsappIcon } from '../components/SocialIcons'
import { BRAND } from '../../content/brand'
import styles from './Footer.module.css'

const PRODUCT_LINKS = [
  { label: 'Pescados', to: '/productos?categoria=pescados' },
  { label: 'Mariscos', to: '/productos?categoria=mariscos' },
  { label: 'Despensa del Pacífico', to: '/productos?categoria=despensa' },
  { label: 'Todos los productos', to: '/productos' },
]

const ABOUT_LINKS = [
  { label: 'Envíos y cobertura', href: '/envios' },
  { label: 'Nuestra costa', href: '/#nuestra-costa' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Recetas', href: '/#recetas' },
  { label: 'Preguntas frecuentes', href: '/#faq' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contacto" className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div>
            <Logo tone="claro" />
            <p className={styles.tagline}>{BRAND.description}</p>
            <div className={styles.social}>
              <a href={BRAND.instagramUrl} className={styles.socialLink}
                target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href={`https://wa.me/${BRAND.phoneHref.replace('+', '')}`} className={styles.socialLink}
                target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <WhatsappIcon />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <FacebookIcon />
              </a>
            </div>
          </div>

          <nav aria-labelledby="footer-productos">
            <h2 id="footer-productos" className={styles.heading}>Productos</h2>
            {PRODUCT_LINKS.map(link => (
              <Link key={link.label} to={link.to} className={styles.link}>{link.label}</Link>
            ))}
          </nav>

          <nav aria-labelledby="footer-nosotros">
            <h2 id="footer-nosotros" className={styles.heading}>Nosotros</h2>
            {ABOUT_LINKS.map(link => (
              <a key={link.label} href={link.href} className={styles.link}>{link.label}</a>
            ))}
          </nav>

          <div>
            <h2 className={styles.heading}>Contacto</h2>
            <a href={`https://wa.me/${BRAND.phoneHref.replace('+', '')}`} className={styles.link}>
              {BRAND.phone}
            </a>
            <a href={`mailto:${BRAND.email}`} className={styles.link}>{BRAND.email}</a>
            <span className={styles.link}>{BRAND.city}</span>
          </div>
        </div>

        <div className={styles.legal}>
          <span>© {year} {BRAND.name}. Todos los derechos reservados.</span>
          <span>Pesca artesanal del Pacífico colombiano</span>
        </div>
      </Container>
    </footer>
  )
}
