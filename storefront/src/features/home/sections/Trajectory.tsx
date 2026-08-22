import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { PENDING_REAL_DATA, TRAJECTORY, yearsInBusiness } from '../../../content/socialProof'
import styles from './Trajectory.module.css'

/** Trayectoria y cifras de confianza. Cifras pendientes de verificar. */
export function Trajectory() {
  const headline = TRAJECTORY.headline.replace('{years}', String(yearsInBusiness()))

  return (
    <Section tone="aqua" aria-labelledby="trayectoria-title">
      <Container>
        <div className={styles.layout}>
          <div>
            <Eyebrow style={{ color: 'var(--text-on-aqua-muted)' }}>Nuestra trayectoria</Eyebrow>
            <h2 id="trayectoria-title" className={styles.headline} style={{ marginTop: 18 }}>
              {headline}
            </h2>
            <p className={styles.body}>{TRAJECTORY.body}</p>
            {PENDING_REAL_DATA && import.meta.env.DEV && (
              <p className={styles.pending}>
                Cifras y trayectoria pendientes de confirmar antes de publicar.
              </p>
            )}
          </div>

          <dl className={styles.stats}>
            {TRAJECTORY.stats.map(stat => (
              <div key={stat.label} className={styles.stat}>
                <dd className={styles.value}>{stat.value}</dd>
                <dt className={styles.label}>{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  )
}
