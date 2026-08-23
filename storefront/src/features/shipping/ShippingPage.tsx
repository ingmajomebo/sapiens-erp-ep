import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { Eyebrow } from '../../shared/components/Eyebrow'
import { Photo } from '../../shared/components/Photo'
import { CoverageMap } from './CoverageMap'
import { SCHEDULE, PACKAGING_NOTES } from '../../content/shippingPolicy'
import { BRAND } from '../../content/brand'
import styles from './ShippingPage.module.css'

export function ShippingPage() {
  return (
    <>
      <Helmet>
        <title>Envíos · {BRAND.name}</title>
        <meta
          name="description"
          content="Cobertura, horarios y costos de envío. Pescado del Pacífico entregado con cadena de frío en el Valle de Aburrá y el oriente antioqueño."
        />
        <link rel="canonical" href={`https://${BRAND.site}/envios`} />
      </Helmet>

      {/* ── Portada ──────────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <Photo
          src="/img/hero-envios-bahia-solano.jpg"
          alt="Pescadores artesanales recogiendo la red al amanecer frente a la costa selvática de Bahía Solano, Chocó"
          priority
          ratio="auto"
          frameClassName={styles.heroImage}
        />
        <span className={styles.heroVeil} aria-hidden="true" />
        <Container className={styles.heroContent}>
          <Eyebrow style={{ color: 'var(--text-on-aqua-muted)' }}>Bahía Solano · Chocó</Eyebrow>
          <h1 className={styles.heroTitle}>Envíos</h1>
          <p className={styles.heroLead}>
            De la lancha a tu cocina sin romper la cadena de frío. Aquí está
            todo lo que necesitas saber antes de pedir.
          </p>
        </Container>
      </header>

      {/* ── Cobertura ────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <Container>
          <h2 className={styles.title}>Dónde entregamos</h2>
          <p className={styles.lead}>
            Vamos habilitando municipios a medida que la ruta de frío lo permite.
            Estos son los que cubrimos hoy.
          </p>
          <div className={styles.mapHolder}>
            <CoverageMap />
          </div>
          <p className={styles.aside}>
            ¿No ves tu municipio? Escríbenos por{' '}
            <a href={`https://wa.me/${BRAND.phoneHref.replace('+', '')}`}>WhatsApp</a>:
            cotizamos envíos fuera de cobertura caso por caso.
          </p>
        </Container>
      </section>

      {/* ── Costos ─────────────────────────────────────────────────────────
          Sin cifras hasta que la operación confirme las tarifas. Publicar un
          precio equivocado en una página de políticas es una promesa que
          después toca romper en el checkout. ───────────────────────────── */}
      <section className={`${styles.section} ${styles.tinted}`}>
        <Container>
          <h2 className={styles.title}>Cuánto cuesta</h2>
          <p className={styles.lead}>
            El costo del envío depende de tu municipio y se calcula al finalizar
            la compra, antes de que confirmes nada. No hay cargos sorpresa
            después.
          </p>
          <p className={styles.aside}>
            Para destinos fuera de cobertura cotizamos caso por caso según el
            peso y el destino. Escríbenos por{' '}
            <a href={`https://wa.me/${BRAND.phoneHref.replace('+', '')}`}>WhatsApp</a>{' '}
            y te pasamos el valor antes de que pidas.
          </p>
        </Container>
      </section>

      {/* ── Horarios ─────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <Container>
          <h2 className={styles.title}>Cuándo llega</h2>
          <ol className={styles.schedule}>
            {SCHEDULE.map((paso, i) => (
              <li key={paso.title} className={styles.step}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <div>
                  <h3 className={styles.stepTitle}>{paso.title}</h3>
                  <p className={styles.stepText}>{paso.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── Empaque y frío ───────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.tinted}`}>
        <Container>
          <h2 className={styles.title}>Cómo viaja</h2>
          <div className={styles.notes}>
            {PACKAGING_NOTES.map(n => (
              <div key={n.title} className={styles.note}>
                <h3 className={styles.noteTitle}>{n.title}</h3>
                <p className={styles.noteText}>{n.text}</p>
              </div>
            ))}
          </div>
          <p className={styles.aside}>
            Si tu pedido llega en mal estado, lo reponemos. Escríbenos el mismo
            día que lo recibas.
          </p>
          <Link to="/productos" className={styles.cta}>Ver productos</Link>
        </Container>
      </section>
    </>
  )
}
