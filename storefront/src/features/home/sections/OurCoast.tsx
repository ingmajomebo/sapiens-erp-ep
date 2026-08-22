import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { CoastMap } from '../../../shared/components/CoastMap'
import styles from './OurCoast.module.css'

/** Sección diferenciadora: respira más que las demás. */
export function OurCoast() {
  return (
    <Section id="nuestra-costa" tone="cream" flush aria-labelledby="costa-title">
      <div className={styles.layout}>
        <div className={styles.media}>
          <img
            src="/img/costa-don-anibal-vertical.jpg"
            alt="Pescador artesanal en la playa de Bahía Solano con su remo tallado a mano"
            width={900} height={1200} loading="lazy"
          />
          {/* Placeholder: confirmar nombre real y autorización de uso de imagen */}
          <figcaption className={styles.caption}>Don Aníbal — Bahía Solano, Chocó</figcaption>
        </div>

        <div className={styles.body}>
          <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>Nuestra costa</Eyebrow>
          <h2 id="costa-title" style={{ marginTop: 18 }}>Compramos directo. Pagamos justo.</h2>

          <p className={styles.text}>
            No hay intermediarios entre la canoa y nuestra bodega. Acordamos el precio en la orilla,
            pagamos el mismo día y compramos toda la captura, no solo las piezas grandes.
          </p>
          <p className={styles.text} style={{ marginTop: 18 }}>
            Cada lote queda registrado con su comunidad, su fecha y su pescador. Por eso podemos
            decirte de dónde viene exactamente lo que estás comiendo.
          </p>

          <CoastMap className={styles.map} />

          <a href="#contacto" className={styles.link}>Conoce el origen de tu pedido →</a>

          {import.meta.env.DEV && (
            <p className={styles.pending}>
              Pendiente: confirmar el nombre real del pescador y su autorización de imagen.
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}
