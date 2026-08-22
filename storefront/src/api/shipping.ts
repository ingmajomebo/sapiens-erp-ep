/* ============================================================================
   Reglas de envío para MOSTRAR en el carrito.
   El backend las recalcula al crear el pedido y su cifra manda sobre esta.
   PENDIENTES DE CONFIRMAR con el negocio.
   ========================================================================== */

export const SHIPPING_MEDELLIN = 8_000
export const SHIPPING_NATIONAL = 18_000
export const FREE_SHIPPING_THRESHOLD = 150_000

/**
 * Mínimo para que la nevera conserve la cadena de frío en tránsito.
 * PENDIENTE DE CONFIRMAR: es un valor operativo, no un supuesto de diseño.
 */
export const COLD_CHAIN_MINIMUM = 60_000

function normalizeCity(city: string): string {
  return city.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function calculateShipping(city: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return normalizeCity(city) === 'medellin' ? SHIPPING_MEDELLIN : SHIPPING_NATIONAL
}
