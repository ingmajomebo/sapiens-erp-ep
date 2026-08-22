import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import styles from './HowItWorks.module.css'

const STEPS = [
  {
    number: '01',
    title: 'Eliges y pides',
    text: 'Armas tu pedido en la tienda. Sin cuenta, sin mínimo: eliges la presentación y la cantidad exacta que necesitas.',
  },
  {
    number: '02',
    title: 'Se pesca y se empaca',
    text: 'Pescadores artesanales del Chocó, con línea de mano y sin redes de arrastre. Limpieza, corte y empaque al vacío dentro de las primeras 24 horas.',
  },
  {
    number: '03',
    title: 'Sale en frío',
    text: 'Cada pedido viaja en nevera sellada con hielo seco. La cadena de frío se verifica al salir de bodega y al entregar.',
  },
  {
    number: '04',
    title: 'Llega a tu casa',
    text: 'Pedidos antes de las 2:00 p.m. salen el mismo día. Pagas contra entrega o por transferencia, como prefieras.',
  },
]

/** Cómo funciona el sistema de compra, de principio a fin. */
export function HowItWorks() {
  return (
    <Section id="como-funciona" tone="aqua" aria-labelledby="como-funciona-title">
      <Container>
        <div className={styles.head}>
          <Eyebrow style={{ color: 'var(--text-on-aqua-muted)' }}>Cómo funciona</Eyebrow>
          <h2 id="como-funciona-title" style={{ marginTop: 18 }}>
            De la canoa a tu cocina, en cuatro pasos.
          </h2>
        </div>

        <ol className={styles.grid}>
          {STEPS.map(step => (
            <li key={step.number} className={styles.step}>
              <div className={styles.number} aria-hidden="true">{step.number}</div>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.text}>{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}
