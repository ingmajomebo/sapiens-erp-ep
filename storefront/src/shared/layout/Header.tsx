import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Container } from '../components/Container'
import { Logo } from '../components/Logo'
import { CartIcon, MenuIcon, SearchIcon } from '../components/ui-icons'
import { MegaMenu } from './MegaMenu'
import { useCartCount } from '../../store/useCartStore'
import styles from './Header.module.css'

const OPEN_DELAY_MS = 150
const CLOSE_DELAY_MS = 200
const MEGA_ID = 'megamenu-productos'

interface HeaderProps {
  /** Transparente sobre el hero; sólido cuando ya se pasó. */
  scrolled: boolean
  onOpenMobileMenu: () => void
  onOpenCart: () => void
}

export function Header({ scrolled, onOpenMobileMenu, onOpenCart }: HeaderProps) {
  const [megaOpen, setMegaOpen] = useState(false)
  const cartCount = useCartCount()
  const timerRef = useRef<number | undefined>(undefined)
  const headerRef = useRef<HTMLElement>(null)

  function scheduleOpen() {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setMegaOpen(true), OPEN_DELAY_MS)
  }

  function scheduleClose() {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setMegaOpen(false), CLOSE_DELAY_MS)
  }

  function closeNow() {
    window.clearTimeout(timerRef.current)
    setMegaOpen(false)
  }

  // Esc y scroll cierran el panel
  useEffect(() => {
    if (!megaOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNow()
    }
    const onScroll = () => closeNow()

    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [megaOpen])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const tone = scrolled || megaOpen ? styles.solid : styles.transparent

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${tone}`}
      onMouseLeave={megaOpen ? scheduleClose : undefined}
    >
      <Container>
        <div className={styles.inner}>
          <div>
            <Link to="/" aria-label="Encanto Pacífico — ir al inicio">
              <Logo tone={scrolled || megaOpen ? 'oscuro' : 'claro'} />
            </Link>
          </div>

          <nav className={styles.nav} aria-label="Navegación principal">
            <button
              type="button"
              className={styles.navItem}
              aria-expanded={megaOpen}
              aria-controls={MEGA_ID}
              onMouseEnter={scheduleOpen}
              onFocus={scheduleOpen}
              onClick={() => (megaOpen ? closeNow() : setMegaOpen(true))}
            >
              Productos
            </button>
            <a href="/#nuestra-costa" className={styles.navItem} onMouseEnter={scheduleClose}>
              Nuestra costa
            </a>
            <a href="/#recetas" className={styles.navItem} onMouseEnter={scheduleClose}>
              Recetas
            </a>
            <a href="/#contacto" className={styles.navItem} onMouseEnter={scheduleClose}>
              Contacto
            </a>
          </nav>

          <div className={styles.actions}>
            <NavLink to="/productos" className={styles.iconButton} aria-label="Buscar productos">
              <SearchIcon />
            </NavLink>

            <button
              type="button"
              className={`${styles.iconButton} ${styles.cart}`}
              onClick={onOpenCart}
              aria-label={
                cartCount > 0
                  ? `Abrir carrito, ${cartCount} producto${cartCount !== 1 ? 's' : ''}`
                  : 'Abrir carrito, vacío'
              }
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className={styles.badge}>
                  <span className={styles.badgeText}>{cartCount}</span>
                </span>
              )}
            </button>

            <button
              type="button"
              className={`${styles.iconButton} ${styles.menuToggle}`}
              onClick={onOpenMobileMenu}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </Container>

      {megaOpen && (
        <div onMouseEnter={() => window.clearTimeout(timerRef.current)}>
          <MegaMenu id={MEGA_ID} onNavigate={closeNow} />
        </div>
      )}
    </header>
  )
}
