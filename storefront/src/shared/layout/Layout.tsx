import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { MobileMenu } from './MobileMenu'
import { Footer } from './Footer'
import { CartDrawer } from '../../features/cart/CartDrawer'
import { useIsScrolled } from '../hooks/useIsScrolled'

/**
 * Cascarón común. El centinela va justo bajo el header: cuando el hero deja
 * de cubrirlo, el header pasa a su estado sólido.
 */
export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { pathname } = useLocation()
  const { sentinelRef, scrolled } = useIsScrolled(80)

  // Solo el home tiene hero: el resto arranca con el header sólido
  const hasHero = pathname === '/'

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <AnnouncementBar />
      <Header
        scrolled={hasHero ? scrolled : true}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenCart={() => setCartOpen(true)}
      />
      {hasHero && <div ref={sentinelRef} aria-hidden="true" />}
      <main id="contenido">
        <Outlet />
      </main>
      <Footer />
      {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
