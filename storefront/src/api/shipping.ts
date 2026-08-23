/* ============================================================================
   Reglas de envío para MOSTRAR en el carrito y en la página de envíos.
   El backend las recalcula al crear el pedido y su cifra manda sobre esta.

   La lista de municipios NO vive aquí: viene de content/coverage.ts, que es
   lo que también dibuja el mapa. Un solo sitio para no cobrar como nacional
   un municipio que sí cubrimos.
   ========================================================================== */

import { isCovered } from '../content/coverage'

/*
 * TARIFAS SIN CONFIRMAR. Estos tres valores estaban ya en el código y siguen
 * aplicándose en el carrito, pero el negocio no los ha validado. Por eso NO
 * se publican en la página de envíos: cobrar mal es un problema interno;
 * publicar mal es una promesa incumplida.
 */
export const SHIPPING_COVERED = 8_000

/** Fuera de cobertura se cotiza por WhatsApp; el checkout no lo permite. */
export const SHIPPING_QUOTED = 18_000

export const FREE_SHIPPING_THRESHOLD = 150_000

/**
 * Mínimo para que la nevera conserve la cadena de frío en tránsito.
 * PENDIENTE DE CONFIRMAR: es un valor operativo, no un supuesto de diseño.
 */
export const COLD_CHAIN_MINIMUM = 60_000

export function calculateShipping(city: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return isCovered(city) ? SHIPPING_COVERED : SHIPPING_QUOTED
}
