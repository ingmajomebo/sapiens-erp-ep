import styles from './Logo.module.css'

/**
 * Lockup oficial de Encanto Pacífico (Brand Guideline, sección 1).
 * Dos monocromos con transparencia, uno por fondo:
 *   claro  → Sunlight Charm, para el header transparente sobre el hero
 *   oscuro → Deep Aqua, para el header con fondo crema tras el scroll
 *
 * El artwork es raster porque el estudio entregó PNG. Se exporta a 400px de
 * ancho, 3× el uso real de 40px de alto, así que queda nítido en pantallas
 * retina. Sustituir por SVG si llega la versión vectorial.
 */
export type LogoTone = 'claro' | 'oscuro'

const SOURCES: Record<LogoTone, string> = {
  claro:  '/img/logo-encanto-claro.png',
  oscuro: '/img/logo-encanto-oscuro.png',
}

export function Logo({ tone = 'oscuro', className }: { tone?: LogoTone; className?: string }) {
  return (
    <img
      src={SOURCES[tone]}
      alt="Encanto Pacífico"
      width={400}
      height={240}
      className={className ? `${styles.logo} ${className}` : styles.logo}
    />
  )
}
