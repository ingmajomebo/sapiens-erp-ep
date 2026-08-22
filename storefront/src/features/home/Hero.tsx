import { Container } from '../../shared/components/Container'
import { ButtonLink } from '../../shared/components/Button'
import { Eyebrow } from '../../shared/components/Eyebrow'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion'
import styles from './Hero.module.css'

const POSTER = '/img/hero-pescador-canoa-amanecer.jpg'
const VIDEO = '/video/hero-pescador-canoa-amanecer.mp4'

const ANCHOR_ITEMS = ['Pesca artesanal', 'Cadena de frío', 'Trazabilidad por lote']

/** El hero no explica el negocio: hace sentir el lugar. */
export function Hero() {
  const reducedMotion = useReducedMotion()

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {reducedMotion ? (
        <img
          src={POSTER}
          alt="Pescador artesanal remando en canoa al amanecer en el Pacífico colombiano"
          width={1920}
          height={1080}
          className={styles.media}
        />
      ) : (
        <video
          className={styles.media}
          poster={POSTER}
          src={VIDEO}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div className={styles.overlay} />

      <Container className={styles.content}>
        <div className={`${styles.reveal} ${styles.d1}`}>
          <Eyebrow>
            <span className={styles.eyebrow}>Pesca artesanal · Pacífico colombiano</span>
          </Eyebrow>
        </div>

        <h1 id="hero-title" className={`${styles.title} ${styles.reveal} ${styles.d2}`}>
          Del mar de nuestra gente,<br />directo a tu mesa.
        </h1>

        <p className={`${styles.subtitle} ${styles.reveal} ${styles.d3}`}>
          Pescado y mariscos capturados por pescadores artesanales del Chocó.
          Empacados el mismo día que salen del agua.
        </p>

        <div className={`${styles.actions} ${styles.reveal} ${styles.d4}`}>
          <ButtonLink to="/productos" variant="primary">Ver productos</ButtonLink>
          <a href="#nuestra-costa" className={styles.secondaryCta}>Conocer nuestra costa</a>
        </div>
      </Container>

      <div className={`${styles.anchor} ${styles.reveal} ${styles.d5}`}>
        <Container>
          <div className={styles.anchorInner}>
            {ANCHOR_ITEMS.map((item, i) => (
              <span key={item}>
                {i > 0 && <span className={styles.dot} aria-hidden="true">· </span>}
                {item}
              </span>
            ))}
          </div>
        </Container>
      </div>
    </section>
  )
}
