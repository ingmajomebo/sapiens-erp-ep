import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { PILLARS } from '../../../content/brand'
import { PILLAR_ICONS } from '../../../shared/components/ui-icons'
import styles from './Pillars.module.css'

/** Los cuatro pilares del brand book, con sus textos oficiales. */
export function Pillars() {
  return (
    <Section tone="cream" aria-labelledby="pilares-title">
      <Container>
        <h2 id="pilares-title" className="sr-only">Por qué Encanto Pacífico</h2>
        <div className={styles.grid}>
          {PILLARS.map(pillar => {
            const Icon = PILLAR_ICONS[pillar.id]
            return (
              <div key={pillar.id} className={styles.item}>
                <div className={styles.icon}><Icon size={32} /></div>
                <h3 className={styles.title}>{pillar.title}</h3>
                <p className={styles.text}>{pillar.text}</p>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
