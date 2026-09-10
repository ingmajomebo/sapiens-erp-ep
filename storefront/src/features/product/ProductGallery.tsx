import { useRef, useState } from 'react'
import styles from './ProductGallery.module.css'

export interface GalleryImage {
  id: string
  role: string
  url: string
  alt: string | null
}

interface ProductGalleryProps {
  images: GalleryImage[]
  /** La foto única del producto. Se usa cuando todavía no hay galería. */
  fallbackUrl: string
  productName: string
}

/**
 * Galería de la ficha de producto: una imagen grande y una tira de miniaturas.
 *
 * <p>Al cambiar de producto se remonta desde la página con un `key`, en vez
 * de reiniciar el estado desde un efecto: así nunca queda seleccionada una
 * foto del producto anterior, y no hay un renderizado intermedio con la
 * imagen equivocada.
 *
 * <p>Con una sola foto se comporta exactamente como antes —una imagen y nada
 * más—, de modo que los productos sin galería no cambian de aspecto. La tira
 * aparece solo cuando hay algo entre lo que elegir.
 */
export function ProductGallery({ images, fallbackUrl, productName }: ProductGalleryProps) {
  const shots: GalleryImage[] = images.length > 0
    ? images
    : [{ id: 'unica', role: 'PRIMARY', url: fallbackUrl, alt: productName }]

  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  /**
   * Punto que se mantiene fijo al ampliar, en porcentaje de la imagen.
   *
   * <p>Sin esto, ampliar siempre enseñaba el centro: para mirar la piel de la
   * cola había que ampliar y no poder llegar. Con el origen bajo el cursor, el
   * comprador dirige el detalle a donde está mirando.
   */
  const [foco, setFoco] = useState({ x: 50, y: 50 })
  const marcoRef = useRef<HTMLButtonElement>(null)

  const current = shots[Math.min(index, shots.length - 1)]
  const alt = current.alt ?? productName

  function go(delta: number) {
    setIndex(prev => (prev + delta + shots.length) % shots.length)
    setZoomed(false)
    setFoco({ x: 50, y: 50 })
  }

  function seguirCursor(e: React.MouseEvent<HTMLButtonElement>) {
    if (!zoomed) return
    const caja = marcoRef.current?.getBoundingClientRect()
    if (!caja) return
    setFoco({
      x: ((e.clientX - caja.left) / caja.width) * 100,
      y: ((e.clientY - caja.top) / caja.height) * 100,
    })
  }

  /** Al ampliar con el teclado no hay cursor: se centra. */
  function alternarZoom(e: React.MouseEvent<HTMLButtonElement>) {
    if (!zoomed && e.clientX !== 0) {
      const caja = marcoRef.current?.getBoundingClientRect()
      if (caja) {
        setFoco({
          x: ((e.clientX - caja.left) / caja.width) * 100,
          y: ((e.clientY - caja.top) / caja.height) * 100,
        })
      }
    }
    setZoomed(z => !z)
  }

  // Las flechas del teclado son lo que espera quien navega sin ratón; sin
  // esto la tira de miniaturas sería inalcanzable salvo tabulando una por una.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    if (e.key === 'Escape' && zoomed) setZoomed(false)
  }

  return (
    <div className={styles.gallery} onKeyDown={onKeyDown}>
      <div className={styles.stage}>
        <button
          ref={marcoRef}
          type="button"
          className={`${styles.frame} ${zoomed ? styles.frameZoomed : ''}`}
          onClick={alternarZoom}
          onMouseMove={seguirCursor}
          onMouseLeave={() => setZoomed(false)}
          aria-label={zoomed ? 'Alejar la fotografía' : 'Ampliar la fotografía'}
        >
          <img
            src={current.url}
            alt={alt}
            width={1200}
            height={900}
            className={styles.image}
            style={zoomed ? { transformOrigin: `${foco.x}% ${foco.y}%` } : undefined}
            /* La primera se carga de inmediato porque es lo primero que se ve;
               las demás solo si el comprador las pide. */
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <span className={styles.zoomHint} aria-hidden="true">
            {zoomed ? 'Alejar' : 'Ampliar'}
          </span>
        </button>

        {shots.length > 1 && (
          <>
            <button type="button" className={`${styles.arrow} ${styles.prev}`}
              onClick={() => go(-1)} aria-label="Fotografía anterior">
              <Chevron direction="left" />
            </button>
            <button type="button" className={`${styles.arrow} ${styles.next}`}
              onClick={() => go(1)} aria-label="Fotografía siguiente">
              <Chevron direction="right" />
            </button>
            <span className={styles.counter}>{index + 1} / {shots.length}</span>
          </>
        )}
      </div>

      {shots.length > 1 && (
        <div className={styles.strip} role="tablist"
          aria-label={`Fotografías de ${productName}`}>
          {shots.map((shot, i) => (
            <button
              key={shot.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ver fotografía ${i + 1} de ${shots.length}`}
              className={`${styles.thumb} ${i === index ? styles.thumbActive : ''}`}
              onClick={() => { setIndex(i); setZoomed(false) }}
            >
              <img src={shot.url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}
