import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { CategoryHero } from './CategoryHero'
import { PresentationCard } from './PresentationCard'
import { CardSkeleton } from './CardSkeleton'
import { StockRequestModal } from './StockRequestModal'
import { storeApi } from '../../api/storeApi'
import { BRAND } from '../../content/brand'
import type { CatalogItem } from '../../api/types'
import styles from './CategoryPage.module.css'

/* Los agotados NO se esconden: siguen contando y se pueden pedir por aviso. */
/*
 * "Más vendidos" queda fuera a propósito: exige agregar ventas reales, y una
 * opción con ese nombre que ordenara por otra cosa engañaría al cliente.
 * Se añade cuando el backend exponga el dato.
 */
const ORDENES = {
  destacados: 'Destacados',
  recientes:  'Más recientes',
  precio_asc: 'Precio: menor a mayor',
  precio_desc:'Precio: mayor a menor',
} as const

type Orden = keyof typeof ORDENES

const COLUMNAS_VALIDAS = [3, 4] as const
const COLUMNAS_POR_DEFECTO = 4

/** Recuerda la densidad elegida mientras el cliente sigue navegando. */
const CLAVE_COLUMNAS = 'ep:catalogo:columnas'

export function CategoryPage() {
  const { categoria, especie } = useParams()
  const slug = especie ?? categoria ?? ''
  const [params, setParams] = useSearchParams()
  const [pidiendo, setPidiendo] = useState<CatalogItem | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoria', slug],
    queryFn: () => storeApi.getCategoryPage(slug),
    enabled: Boolean(slug),
  })

  const orden = (params.get('orden') as Orden) ?? 'destacados'
  const columnas = leerColumnas(params.get('cols'))

  const items = useMemo(() => ordenar(data?.items ?? [], orden), [data, orden])

  function cambiarOrden(valor: Orden) {
    const siguiente = new URLSearchParams(params)
    if (valor === 'destacados') siguiente.delete('orden')
    else siguiente.set('orden', valor)
    setParams(siguiente, { replace: true })
  }

  function cambiarColumnas(valor: number) {
    try { localStorage.setItem(CLAVE_COLUMNAS, String(valor)) } catch { /* modo privado */ }
    const siguiente = new URLSearchParams(params)
    if (valor === COLUMNAS_POR_DEFECTO) siguiente.delete('cols')
    else siguiente.set('cols', String(valor))
    setParams(siguiente, { replace: true })
  }

  if (isError) {
    return (
      <Container>
        <div className={styles.state}>
          <p className={styles.stateTitle}>No pudimos cargar esta categoría.</p>
          <p className={styles.stateText}>Puede ser una caída momentánea de la conexión.</p>
          <button type="button" className={styles.retry} onClick={() => refetch()}>
            Reintentar
          </button>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Helmet>
        <title>{data ? `${data.hero.title} · ${BRAND.name}` : `Catálogo · ${BRAND.name}`}</title>
        {data?.hero.description && <meta name="description" content={data.hero.description} />}
        <link rel="canonical" href={`https://${BRAND.site}/${slug}`} />
      </Helmet>

      {data && (
        <CategoryHero
          hero={data.hero}
          breadcrumbs={data.breadcrumbs}
          fallbackImage={data.items[0]?.imageUrl}
        />
      )}

      <Container>
        {/* Subcategorías: atajos, no un segundo menú */}
        {data && data.children.length > 0 && (
          <nav className={styles.children} aria-label="Subcategorías">
            {data.children.map(c => (
              <Link key={c.slug} to={`/${data.hero.slug}/${c.slug}`} className={styles.child}>
                {c.title}
              </Link>
            ))}
          </nav>
        )}

        <div className={styles.bar}>
          <span className={styles.count}>
            {isLoading ? 'Cargando…' : `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`}
          </span>

          <div className={styles.tools}>
            <label className={styles.sort}>
              <span className={styles.sortLabel}>Ordenar por</span>
              <select
                value={orden}
                onChange={e => cambiarOrden(e.target.value as Orden)}
                className={styles.select}
              >
                {Object.entries(ORDENES).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </label>

            <div className={styles.density} role="group" aria-label="Densidad de la rejilla">
              {COLUMNAS_VALIDAS.map(n => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.densityButton} ${columnas === n ? styles.densityActive : ''}`}
                  onClick={() => cambiarColumnas(n)}
                  aria-pressed={columnas === n}
                  aria-label={`${n} columnas`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className={styles.grid} data-cols={columnas}>
            {Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {data && items.length === 0 && (
          <div className={styles.state}>
            <p className={styles.stateTitle}>No hay productos publicados en esta categoría.</p>
            <p className={styles.stateText}>Estamos reponiendo. Vuelve pronto.</p>
            <Link to="/productos" className={styles.retry}>Ver todo el catálogo</Link>
          </div>
        )}

        {items.length > 0 && (
          <div className={styles.grid} data-cols={columnas}>
            {items.map(item => (
              <PresentationCard key={item.id} item={item} onNotifyMe={setPidiendo} />
            ))}
          </div>
        )}

        <div style={{ height: 'var(--section-y)' }} />
      </Container>

      {pidiendo && (
        <StockRequestModal item={pidiendo} onClose={() => setPidiendo(null)} />
      )}
    </>
  )
}

/* ── Utilidades ───────────────────────────────────────────────────────────── */

function leerColumnas(desdeUrl: string | null): number {
  const n = Number(desdeUrl)
  if (COLUMNAS_VALIDAS.includes(n as 3 | 4)) return n
  try {
    const guardado = Number(localStorage.getItem(CLAVE_COLUMNAS))
    if (COLUMNAS_VALIDAS.includes(guardado as 3 | 4)) return guardado
  } catch { /* modo privado: se usa el valor por defecto */ }
  return COLUMNAS_POR_DEFECTO
}

/**
 * Los agotados caen al final en cualquier orden: siguen visibles, como se
 * pidió, pero no le quitan el sitio a lo que sí se puede comprar hoy.
 */
function ordenar(items: CatalogItem[], orden: Orden): CatalogItem[] {
  const copia = [...items]
  const agotado = (i: CatalogItem) => (i.availability === 'OUT_OF_STOCK' ? 1 : 0)

  const criterio: Record<Orden, (a: CatalogItem, b: CatalogItem) => number> = {
    destacados:  (a, b) => a.sortOrder - b.sortOrder,
    recientes:   (a, b) => b.publishedAt.localeCompare(a.publishedAt),
    precio_asc:  (a, b) => a.price - b.price,
    precio_desc: (a, b) => b.price - a.price,
  }

  return copia.sort((a, b) => agotado(a) - agotado(b) || criterio[orden](a, b))
}
