import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { QualitySeal } from '../../../shared/components/QualitySeal'
import { FreshnessIcon, OriginIcon, PackagingIcon } from '../../../shared/components/ui-icons'
import styles from './Packaging.module.css'

const NOTES = [
  {
    icon: PackagingIcon,
    title: 'Empaque al vacío',
    text: 'Cada corte se sella al vacío por porción. Sin aire, sin quemadura por frío y con la etiqueta del producto a la vista.',
  },
  {
    icon: FreshnessIcon,
    title: 'Nevera sellada',
    text: 'El pedido viaja en nevera de icopor con cinta de seguridad. Si llega abierta, no la recibas: te reponemos el pedido.',
  },
  {
    icon: OriginIcon,
    title: 'Trazabilidad por lote',
    text: 'Cada empaque lleva su lote. Con ese número sabemos qué día se pescó, quién lo pescó y en qué comunidad.',
  },
]

/** Producto premium: cómo se empaca y cómo llega. */
export function Packaging() {
  return (
    <Section tone="cream" aria-labelledby="empaque-title">
      <Container>
        <div className={styles.head}>
          <div className={styles.headText}>
            <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>Producto premium</Eyebrow>
            <h2 id="empaque-title" style={{ marginTop: 18 }}>
              Se nota antes de abrirlo.
            </h2>
            <p className={styles.intro}>
              Trabajamos producto de primera y lo tratamos como tal: porcionado, sellado al vacío
              y despachado en frío. Lo que llega a tu puerta se ve tan cuidado como sabe.
            </p>
          </div>
          <div className={styles.seal}>
            <QualitySeal size={148} />
          </div>
        </div>

        <div className={styles.grid}>
          <figure className={`${styles.figure} ${styles.tall}`}>
            <img
              src="/img/empaque-vacio-productos.jpg"
              alt="Empaques al vacío de pulpo, cola de langosta y bagre de mar sobre madera"
              width={1200} height={800} loading="lazy"
            />
            <figcaption className={styles.caption}>Sellado al vacío, porción por porción</figcaption>
          </figure>

          <figure className={`${styles.figure} ${styles.short}`}>
            <img
              src="/img/empaque-nevera-despacho.jpg"
              alt="Repartidor cargando neveras selladas de Encanto Pacífico desde el camión"
              width={1200} height={800} loading="lazy"
            />
            <figcaption className={styles.caption}>Despacho en frío</figcaption>
          </figure>

          <figure className={`${styles.figure} ${styles.short}`}>
            <img
              src="/img/empaque-caja-envio.jpg"
              alt="Caja de envío de Encanto Pacífico con el sello de garantía de calidad"
              width={1000} height={1000} loading="lazy"
            />
            <figcaption className={styles.caption}>Caja con sello de garantía</figcaption>
          </figure>
        </div>

        <div className={styles.notes}>
          {NOTES.map(note => (
            <div key={note.title}>
              <note.icon size={24} className={styles.noteIcon} />
              <h3 className={styles.noteTitle}>{note.title}</h3>
              <p className={styles.noteText}>{note.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
