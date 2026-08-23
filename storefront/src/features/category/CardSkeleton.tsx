import styles from './CardSkeleton.module.css'

/**
 * Silueta de una tarjeta mientras carga.
 *
 * Reproduce la proporción real de la foto y el alto del texto para que, al
 * llegar los datos, nada se desplace: el esqueleto y la tarjeta ocupan lo mismo.
 */
export function CardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.media} />
      <div className={styles.body}>
        <span className={`${styles.line} ${styles.short}`} />
        <span className={`${styles.line} ${styles.title}`} />
        <span className={`${styles.line} ${styles.medium}`} />
        <span className={`${styles.line} ${styles.price}`} />
      </div>
    </div>
  )
}
