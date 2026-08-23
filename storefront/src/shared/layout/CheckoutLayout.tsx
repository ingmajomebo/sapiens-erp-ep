import { Outlet } from 'react-router-dom'
import { Container } from '../components/Container'
import { GuaranteeIcon } from '../components/ui-icons'
import { BRAND } from '../../content/brand'
import styles from './CheckoutLayout.module.css'

/**
 * Cascarón del checkout: sin menú, sin buscador, sin carrito flotante.
 *
 * Quien llegó aquí ya decidió; cada enlace de navegación es una salida. La
 * página trae su propia cabecera con el logo, que sigue siendo el único
 * camino de vuelta a la tienda.
 */
export function CheckoutLayout() {
  const year = new Date().getFullYear()

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <main id="contenido">
        <Outlet />
      </main>

      {/* Pie mínimo: acompaña en el momento de pagar, no invita a irse */}
      <footer className={styles.footer}>
        <Container>
          <div className={styles.inner}>
            <p className={styles.trust}>
              <GuaranteeIcon className={styles.icon} />
              Compra protegida · Cadena de frío garantizada
            </p>

            <p className={styles.help}>
              ¿Necesitas ayuda?{' '}
              <a href={`https://wa.me/${BRAND.phoneHref.replace('+', '')}`}>{BRAND.phone}</a>
              {' · '}
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </p>

            <p className={styles.legal}>© {year} {BRAND.name}</p>
          </div>
        </Container>
      </footer>
    </>
  )
}
