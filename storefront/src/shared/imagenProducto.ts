/**
 * Construye las variantes de una foto de producto.
 *
 * <p>El backend genera miniaturas en 200, 400 y 800 px con `?w=`. La tarjeta
 * pedía el original: unos 250 KB por foto para mostrarla a 290 px de ancho.
 * Cuatro tarjetas sumaban un megabyte que nadie llega a ver.
 *
 * <p>No se toca una URL ajena —una foto externa o un archivo estático no
 * entiende `?w=`— ni una que ya traiga parámetros.
 */
const ANCHOS = [200, 400, 800] as const

function esServida(url: string): boolean {
  return url.includes('/api/v1/products/') && !url.includes('?')
}

export function fotoProducto(url: string | null | undefined, ancho: 200 | 400 | 800 = 400): string {
  if (!url) return ''
  return esServida(url) ? `${url}?w=${ancho}` : url
}

/**
 * `srcSet` para que el navegador elija según densidad de pantalla y ancho real.
 * Sin esto, una pantalla normal descarga lo mismo que una Retina.
 */
export function fotoProductoSrcSet(url: string | null | undefined): string | undefined {
  if (!url || !esServida(url)) return undefined
  return ANCHOS.map(w => `${url}?w=${w} ${w}w`).join(', ')
}
