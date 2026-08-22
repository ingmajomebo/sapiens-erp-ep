import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { Section } from '../../shared/components/Section'
import { Eyebrow } from '../../shared/components/Eyebrow'
import { ProductCard } from './ProductCard'
import { storeApi } from '../../api/storeApi'
import { BRAND } from '../../content/brand'
import styles from './CatalogPage.module.css'

const ALL = 'todas'

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const active = params.get('categoria') ?? ALL

  const { data: catalog, isLoading, isError } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => storeApi.getCatalog(),
  })

  const products = useMemo(() => {
    const all = [...(catalog?.products ?? [])].sort((a, b) => a.webSortOrder - b.webSortOrder)
    return active === ALL ? all : all.filter(p => p.categoryId === active)
  }, [catalog, active])

  function selectCategory(id: string) {
    if (id === ALL) setParams({}, { replace: true })
    else setParams({ categoria: id }, { replace: true })
  }

  return (
    <>
      <Helmet>
        <title>Productos · Encanto Pacífico</title>
        <meta
          name="description"
          content="Pescado y mariscos de pesca artesanal del Pacífico colombiano, empacados al vacío y enviados con cadena de frío."
        />
        <link rel="canonical" href={`https://${BRAND.site}/productos`} />
      </Helmet>

      <div className={styles.hero}>
        <Container>
          <Eyebrow style={{ color: 'var(--text-on-aqua-muted)' }}>Nuestros productos</Eyebrow>
          <h1 className={styles.title} style={{ marginTop: 18, fontSize: 'var(--fs-h2)' }}>
            Lo que llegó del mar
          </h1>
          <p className={styles.lead}>
            Cada pieza viene de una comunidad concreta del Chocó y del Valle. Elige la
            presentación que necesites: lo demás lo hacemos nosotros.
          </p>
        </Container>
      </div>

      <Section tone="cream" flush>
        <Container>
          <div className={styles.bar}>
            <div className={styles.filters}>
              <button
                type="button"
                className={`${styles.filter} ${active === ALL ? styles.filterActive : ''}`}
                onClick={() => selectCategory(ALL)}
              >
                Todas
              </button>
              {(catalog?.categories ?? []).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.filter} ${active === cat.id ? styles.filterActive : ''}`}
                  onClick={() => selectCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {catalog && (
              <span className={styles.count}>
                {products.length} {products.length === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </div>

          {isLoading && <p className={styles.state}>Cargando el catálogo…</p>}
          {isError && (
            <p className={styles.state}>
              No pudimos cargar el catálogo. Vuelve a intentarlo en un momento.
            </p>
          )}

          {catalog && products.length === 0 && (
            <p className={styles.empty}>
              No hay productos publicados en esta categoría por ahora.
            </p>
          )}

          {products.length > 0 && (
            <div className={styles.grid}>
              {products.map(product => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          )}

          <div style={{ height: 'var(--section-y)' }} />
        </Container>
      </Section>
    </>
  )
}
