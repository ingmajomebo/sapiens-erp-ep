import { useEffect, useState } from 'react'
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

  /**
   * El video se pide DESPUÉS de que la página termine de cargar.
   *
   * <p>Pesa 1,6 MB y empezaba a bajar a la vez que las fotos de producto,
   * quitándoles ancho de banda: la portada pintaba en un segundo y las
   * tarjetas seguían apareciendo de a una hasta el sexto. Como el póster es el
   * primer fotograma, el cambio no se nota; lo que sí se nota es que el
   * producto llega antes.
   */
  const [mostrarVideo, setMostrarVideo] = useState(
    // Si el componente monta con la página ya cargada —una navegación interna
    // de vuelta a la portada— no hay nada que esperar.
    () => typeof document !== 'undefined' && document.readyState === 'complete',
  )

  useEffect(() => {
    if (reducedMotion || mostrarVideo) return
    const alCargar = () => setMostrarVideo(true)
    window.addEventListener('load', alCargar)
    return () => window.removeEventListener('load', alCargar)
  }, [reducedMotion, mostrarVideo])

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {reducedMotion || !mostrarVideo ? (
        <img
          src={POSTER}
          alt="Pescador artesanal remando en canoa al amanecer en el Pacífico colombiano"
          width={1920}
          height={1080}
          /* Es lo primero y lo más grande que se ve: se pide con prioridad y
             sin diferir, al contrario que el resto de imágenes. */
          fetchPriority="high"
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

        {/* Una sola línea, como la de una tienda que se presenta de un golpe.
            El detalle —de dónde sale y quién lo pesca— va debajo y en pequeño:
            quien quiera saberlo lo lee, y quien no, ya entendió la promesa. */}
        <h1 id="hero-title" className={`${styles.title} ${styles.reveal} ${styles.d2}`}>
          El mejor pescado, seleccionado y llevado a tu mesa.
        </h1>

        <p className={`${styles.subtitle} ${styles.reveal} ${styles.d3}`}>
          Pescado y mariscos capturados por pescadores artesanales.
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
