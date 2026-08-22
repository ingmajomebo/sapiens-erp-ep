import type { ReactNode } from 'react'
import styles from './Eyebrow.module.css'

/** Etiqueta pequeña en versalitas que antecede a los títulos de sección. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <span className={styles.eyebrow} style={style}>{children}</span>
}
