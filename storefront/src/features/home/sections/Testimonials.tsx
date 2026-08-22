import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { PENDING_REAL_DATA, TESTIMONIALS } from '../../../content/socialProof'
import styles from './Testimonials.module.css'

/** Testimonios largos. Pendientes de recoger con consentimiento. */
export function Testimonials() {
  return (
    <Section tone="cream" aria-labelledby="testimonios-title">
      <Container>
        <div className={styles.layout}>
          <div>
            <div className={styles.head}>
              <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>Testimonios</Eyebrow>
              <h2 id="testimonios-title" style={{ marginTop: 14, marginBottom: 44 }}>
                Hogares que ya no compran pescado en otra parte.
              </h2>
            </div>

            <div className={styles.list}>
              {TESTIMONIALS.map((t, i) => (
                <blockquote key={i}>
                  <p className={styles.quote}>“{t.quote}”</p>
                  <footer className={styles.author}>
                    <div className={styles.name}>{t.author}</div>
                    <div className={styles.role}>{t.role}</div>
                  </footer>
                </blockquote>
              ))}
            </div>

            {PENDING_REAL_DATA && import.meta.env.DEV && (
              <p className={styles.pending}>
                Testimonios pendientes: recoger citas reales con consentimiento por escrito.
              </p>
            )}
          </div>

          <figure className={styles.media}>
            <img
              src="/img/pescadero-robalo-entero.jpg"
              alt="Pescadero de Encanto Pacífico con delantal de marca sosteniendo un róbalo entero"
              width={1000} height={1250} loading="lazy"
            />
          </figure>
        </div>
      </Container>
    </Section>
  )
}
