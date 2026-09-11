import styles from './ProductCardSkeleton.module.css'

/**
 * El hueco de una tarjeta mientras llegan los datos.
 *
 * <p>Ocupa exactamente el mismo espacio que la tarjeta real —misma proporción
 * de foto, mismas alturas de texto y botón—, así que al llegar el producto
 * nada salta ni empuja lo de abajo. Un esqueleto que no mide lo mismo es peor
 * que ninguno: cambia el salto de lugar en vez de evitarlo.
 */
export function ProductCardSkeleton() {
  return (
    <article className={styles.card} aria-hidden="true">
      <div className={styles.media} />
      <div className={styles.body}>
        <span className={`${styles.line} ${styles.origin}`} />
        <span className={`${styles.line} ${styles.name}`} />
        <span className={`${styles.line} ${styles.presentation}`} />
        <span className={`${styles.line} ${styles.price}`} />
        <span className={styles.button} />
      </div>
    </article>
  )
}
