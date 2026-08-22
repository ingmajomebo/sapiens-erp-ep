import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import styles from './AnnouncementBar.module.css'

const MESSAGES = [
  'Envíos a toda Colombia · Cadena de frío garantizada',
  'Pedidos antes de las 2:00 p.m. salen el mismo día',
  'Pesca artesanal directa de comunidades del Chocó',
]

const ROTATE_MS = 5000
const FADE_MS = 300

export function AnnouncementBar() {
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Sin movimiento: se queda el primer mensaje fijo
    if (reducedMotion) return

    const interval = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, FADE_MS)
    }, ROTATE_MS)

    return () => window.clearInterval(interval)
  }, [reducedMotion])

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <span className={`${styles.message} ${visible ? styles.visible : styles.hidden}`}>
        {MESSAGES[index]}
      </span>
    </div>
  )
}
