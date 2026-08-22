import { useRef, useState } from 'react'
import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { CollapseIcon, ExpandIcon } from '../../../shared/components/ui-icons'
import styles from './Faq.module.css'

const ITEMS = [
  {
    q: '¿Cómo garantizan la cadena de frío?',
    a: 'El producto se congela a -18 °C dentro de las primeras 24 horas tras la captura y viaja en nevera sellada con hielo seco. Registramos la temperatura al salir de bodega y al entregar. Si la nevera llega abierta o el producto sin frío, no lo recibas: te reponemos el pedido completo.',
  },
  {
    q: '¿A qué ciudades hacen envíos y en cuánto tiempo llegan?',
    a: 'Despachamos a toda Colombia. En Medellín entregamos el mismo día si pides antes de las 2:00 p.m. Al resto del país, entre 24 y 72 horas según la ciudad. Al elegir tu ciudad en el checkout verás el costo y el tiempo estimado.',
  },
  {
    q: '¿El producto llega congelado o fresco?',
    a: 'Llega congelado. Es la única forma honesta de mantener producto del Chocó en su punto hasta una cocina en el interior del país. Se congela una sola vez, en las primeras 24 horas, y no se descongela en ningún punto del trayecto.',
  },
  {
    q: '¿Qué pasa si mi pedido llega en mal estado?',
    a: 'Escríbenos por WhatsApp el mismo día de la entrega con una foto del producto y el número de pedido. Reponemos o devolvemos el dinero, lo que prefieras. No pedimos que devuelvas el producto.',
  },
  {
    q: '¿Cómo pago mi pedido?',
    a: 'Contra entrega en efectivo, o por transferencia a Nequi o Bancolombia. Si eliges transferencia, al confirmar te mostramos los datos y despachamos apenas verifiquemos el pago.',
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const panelRefs = useRef<Array<HTMLDivElement | null>>([])

  return (
    <Section id="faq" tone="cream" aria-labelledby="faq-title">
      <Container>
        <div className={styles.wrap}>
          <div className={styles.head}>
            <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>Preguntas frecuentes</Eyebrow>
            <h2 id="faq-title" style={{ marginTop: 14 }}>Lo que suelen preguntarnos</h2>
          </div>

          {ITEMS.map((item, i) => {
            const isOpen = openIndex === i
            const panelId = `faq-panel-${i}`
            const buttonId = `faq-button-${i}`
            const height = isOpen ? panelRefs.current[i]?.scrollHeight ?? 0 : 0

            return (
              <div key={item.q} className={styles.row}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    className={styles.trigger}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                  >
                    {item.q}
                    <span className={styles.sign}>
                      {isOpen ? <CollapseIcon /> : <ExpandIcon />}
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={styles.panel}
                  style={{ height }}
                >
                  <div ref={el => { panelRefs.current[i] = el }}>
                    <p className={styles.answer}>{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
