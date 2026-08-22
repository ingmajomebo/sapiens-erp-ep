import { Container } from '../../../shared/components/Container'
import styles from './FishingQuote.module.css'

/** Frase a sangre: la captura y la frescura, en una sola idea. */
export function FishingQuote() {
  return (
    <section className={styles.section} aria-labelledby="frase-title">
      <img
        src="/img/frase-pesca-linea-mano.jpg"
        alt=""
        aria-hidden="true"
        width={1920} height={900}
        loading="lazy"
        className={styles.bg}
      />
      <span className={styles.veil} />
      <Container>
        <blockquote className={styles.inner}>
          <p id="frase-title" className={styles.quote}>
            Se pesca con línea de mano, una pieza a la vez. Se limpia en la orilla, se sella en frío
            antes de que caiga la tarde y duerme en hielo hasta tu cocina. Ese es todo el secreto:
            entre el mar y tu mesa no pasa nada más.
          </p>
          <footer className={styles.attribution}>
            Pesca artesanal · Bahía Solano · Nuquí · Buenaventura
          </footer>
        </blockquote>
      </Container>
    </section>
  )
}
