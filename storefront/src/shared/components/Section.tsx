import type { ReactNode } from 'react'
import styles from './Section.module.css'

type Tone = 'cream' | 'aqua' | 'white'

interface SectionProps {
  children: ReactNode
  tone?: Tone
  id?: string
  /** Deja el padding vertical al componente hijo (secciones a sangre). */
  flush?: boolean
  className?: string
  'aria-labelledby'?: string
}

/** Bloque de página con el ritmo vertical de 120px (72px en móvil). */
export function Section({
  children,
  tone = 'cream',
  id,
  flush = false,
  className,
  ...rest
}: SectionProps) {
  const classes = [flush ? '' : styles.section, styles[tone], className]
    .filter(Boolean)
    .join(' ')
  return (
    <section id={id} className={classes} {...rest}>
      {children}
    </section>
  )
}
