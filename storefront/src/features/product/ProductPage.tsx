import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { Button } from '../../shared/components/Button'
import { PresentationPicker } from './PresentationPicker'
import {
  CollapseIcon, DecreaseIcon, ExpandIcon, FreshnessIcon, GuaranteeIcon,
  IncreaseIcon, OriginIcon, PackagingIcon, QualityIcon, ShippingIcon,
} from '../../shared/components/ui-icons'
import { formatPrice } from '../../shared/format'
import { storeApi } from '../../api/storeApi'
import { useCartStore, MAX_UNITS_PER_LINE } from '../../store/useCartStore'
import { BRAND } from '../../content/brand'
import styles from './ProductPage.module.css'

const ATTRIBUTES = [
  { icon: PackagingIcon, text: 'Empacado al vacío individualmente' },
  { icon: FreshnessIcon, text: 'Congelado en origen, cadena de frío continua' },
  { icon: QualityIcon,   text: 'Limpio y porcionado, listo para cocinar' },
  { icon: ShippingIcon,  text: 'Envío gratis en pedidos desde $150.000' },
]

export function ProductPage() {
  const { slug = '' } = useParams()
  const addItem = useCartStore(s => s.addItem)
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [openPanel, setOpenPanel] = useState<string | null>('conservacion')

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => storeApi.getProduct(slug),
  })

  // Al cargar, se preselecciona la primera presentación disponible
  useEffect(() => {
    if (!product) return
    const first = product.presentations.find(p => p.available) ?? product.presentations[0]
    setSelectedId(first?.id ?? '')
    setQuantity(1)
  }, [product])

  if (isLoading) return <Container><p className={styles.state}>Cargando…</p></Container>
  if (isError || !product) {
    return <Container><p className={styles.state}>No encontramos ese producto.</p></Container>
  }

  const selected = product.presentations.find(p => p.id === selectedId) ?? product.presentations[0]
  const total = selected ? selected.price * quantity : 0
  const canBuy = Boolean(selected?.available)

  const panels = [
    { id: 'conservacion', title: 'Conservación y descongelado', body: product.conservation },
    {
      id: 'envios', title: 'Envíos y cobertura',
      body: 'Despachamos a toda Colombia en nevera sellada con cadena de frío. En Medellín entregamos el mismo día si pides antes de las 2:00 p.m.; al resto del país, entre 24 y 72 horas.',
    },
    {
      id: 'origen', title: 'Origen y trazabilidad',
      body: `Comprado directo a pescadores artesanales de ${product.origin ?? 'el Pacífico colombiano'}. Cada empaque lleva su lote: con ese número sabemos qué día se pescó y quién lo pescó.`,
    },
  ]

  function handleAdd() {
    if (!selected) return
    addItem({
      presentationId: selected.id,
      productSlug: product!.slug,
      productName: product!.name,
      presentationName: selected.name,
      unitPrice: selected.price,
      imageUrl: product!.imageUrl ?? '',
    }, quantity)
  }

  return (
    <>
      <Helmet>
        <title>{`${product.name} · Encanto Pacífico`}</title>
        <meta name="description" content={product.description ?? BRAND.description} />
        <link rel="canonical" href={`https://${BRAND.site}/productos/${product.slug}`} />
      </Helmet>

      <Container>
        <div className={styles.layout}>
          <div className={styles.media}>
            <img
              src={product.imageUrl || '/img/producto-pargo-rojo.jpg'}
              alt={product.imageAlt || product.name}
              width={1200} height={900}
              className={styles.image}
            />
          </div>

          <div>
            {product.origin && (
              <span className={styles.origin}>
                <OriginIcon /> {product.origin}
              </span>
            )}

            <h1 className={styles.name}>{product.name}</h1>

            {product.description && <p className={styles.description}>{product.description}</p>}

            <ul className={styles.attributes}>
              {ATTRIBUTES.map(attr => (
                <li key={attr.text} className={styles.attribute}>
                  <attr.icon className={styles.attributeIcon} />
                  {attr.text}
                </li>
              ))}
            </ul>

            <PresentationPicker
              presentations={product.presentations}
              selectedId={selected?.id ?? ''}
              onSelect={id => { setSelectedId(id); setQuantity(1) }}
            />

            {canBuy ? (
              <>
                <div className={styles.total}>{formatPrice(total)}</div>
                <div className={styles.totalNote}>
                  El importe final se ajusta al peso exacto en despacho.
                </div>

                <div className={styles.buy}>
                  <div className={styles.stepper}>
                    <button
                      type="button" className={styles.stepperButton}
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Quitar una unidad"
                    >
                      <DecreaseIcon />
                    </button>
                    <span className={styles.stepperValue} aria-live="polite">{quantity}</span>
                    <button
                      type="button" className={styles.stepperButton}
                      onClick={() => setQuantity(q => Math.min(MAX_UNITS_PER_LINE, q + 1))}
                      disabled={quantity >= MAX_UNITS_PER_LINE}
                      aria-label="Añadir una unidad"
                    >
                      <IncreaseIcon />
                    </button>
                  </div>
                  <Button variant="primary" className={styles.addButton} onClick={handleAdd}>
                    Añadir al carrito
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.soldOut}>
                Esta presentación está agotada. Escríbenos por WhatsApp y te avisamos
                cuando vuelva a entrar.
              </p>
            )}

            <div className={styles.guarantee}>
              <GuaranteeIcon className={styles.guaranteeIcon} />
              <p className={styles.guaranteeText}>
                Si tu pedido llega en mal estado, lo reponemos. Sin preguntas.
              </p>
            </div>

            <div className={styles.accordion}>
              {panels.filter(p => p.body).map(panel => {
                const isOpen = openPanel === panel.id
                return (
                  <div key={panel.id} className={styles.accordionRow}>
                    <h2>
                      <button
                        type="button"
                        className={styles.accordionTrigger}
                        aria-expanded={isOpen}
                        aria-controls={`panel-${panel.id}`}
                        onClick={() => setOpenPanel(isOpen ? null : panel.id)}
                      >
                        {panel.title}
                        <span className={styles.accordionSign}>
                          {isOpen ? <CollapseIcon /> : <ExpandIcon />}
                        </span>
                      </button>
                    </h2>
                    {isOpen && (
                      <div id={`panel-${panel.id}`} className={styles.accordionPanel}>
                        {panel.body}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Container>
    </>
  )
}
