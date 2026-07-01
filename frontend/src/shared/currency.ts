/**
 * Formats a number as Colombian pesos (COP).
 * Output: $ 1.000.000 (dot as thousands separator, no decimals by default)
 */
export function formatCOP(amount: number, showDecimals = false): string {
  const value = showDecimals ? amount : Math.round(amount)
  const formatted = value.toLocaleString('es-CO', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })
  return `$ ${formatted}`
}
