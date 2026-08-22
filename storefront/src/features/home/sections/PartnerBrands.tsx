import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Eyebrow } from '../../../shared/components/Eyebrow'
import { PARTNER_BRANDS, PENDING_REAL_DATA } from '../../../content/socialProof'
import styles from './PartnerBrands.module.css'

/** Restaurantes, hoteles y aliados. Logos pendientes de autorización. */
export function PartnerBrands() {
  return (
    <Section tone="cream" aria-labelledby="marcas-title">
      <Container>
        <div className={styles.head}>
          <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>Confían en nosotros</Eyebrow>
          <h2 id="marcas-title" style={{ marginTop: 14 }}>
            Cocinas que eligen nuestro producto.
          </h2>
        </div>

        <div className={styles.grid}>
          {PARTNER_BRANDS.map(brand => (
            <div key={brand.name} className={styles.cell}>
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className={styles.logo} loading="lazy" />
              ) : (
                <span className={styles.slot}>{brand.name}</span>
              )}
            </div>
          ))}
        </div>

        {PENDING_REAL_DATA && import.meta.env.DEV && (
          <p className={styles.pending}>
            Logos pendientes: incluir solo clientes con autorización de uso de marca.
          </p>
        )}
      </Container>
    </Section>
  )
}
