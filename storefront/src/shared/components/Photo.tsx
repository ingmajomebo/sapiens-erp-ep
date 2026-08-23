import { useEffect, useRef, useState } from 'react'
import styles from './Photo.module.css'

interface PhotoProps {
  src: string
  alt: string
  /** Proporción del hueco: "4 / 5", "16 / 9". Reserva el espacio antes de cargar. */
  ratio?: string
  /**
   * Para la imagen que se ve al abrir la página (el hero). Se descarga con
   * prioridad y sin diferir: aplazarla retrasaría el primer pintado.
   */
  priority?: boolean
  className?: string
  width?: number
  height?: number
  /** Se aplica al hueco, no a la imagen. */
  frameClassName?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Imagen que aparece COMPLETA, nunca a medio pintar.
 *
 * El navegador, por su cuenta, dibuja el JPEG a medida que llegan los bytes:
 * primero una franja, después otra, o una versión borrosa que se va afinando.
 * En una rejilla de veinte fotos eso se ve como una página rota.
 *
 * Aquí la imagen nace transparente y solo se revela cuando `decode()` confirma
 * que está entera y lista para pintar. Mientras tanto se ve el hueco tintado,
 * que ya ocupa su tamaño final: por eso tampoco hay salto de maquetación.
 */
export function Photo({
  src, alt, ratio = '4 / 5', priority = false,
  className = '', frameClassName = '', width, height,
  onMouseEnter, onMouseLeave,
}: PhotoProps) {
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = ref.current
    if (!img) return

    let cancelled = false
    setReady(false)
    const reveal = () => { if (!cancelled) setReady(true) }

    // Venía de caché: ya está entera, no hay nada que esperar
    if (img.complete && img.naturalWidth > 0) {
      img.decode().then(reveal).catch(reveal)
      return () => { cancelled = true }
    }

    const onLoad = () => {
      // decode() garantiza que el pintado no va a trabarse; si el navegador
      // no lo soporta o falla, se revela igual — vale más ver la foto.
      img.decode().then(reveal).catch(reveal)
    }
    // Una imagen rota no puede quedarse invisible para siempre
    const onError = () => reveal()

    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
    return () => {
      cancelled = true
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }
  }, [src])

  return (
    <span
      className={`${styles.frame} ${frameClassName}`}
      style={{ aspectRatio: ratio }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={`${styles.image} ${ready ? styles.ready : ''} ${className}`}
      />
    </span>
  )
}
