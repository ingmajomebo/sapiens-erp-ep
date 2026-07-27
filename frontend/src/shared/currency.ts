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

/**
 * Formats a stock/weight quantity using Colombian locale (comma = decimal separator).
 * Examples (trimTrailing=false): 20 → "20,000" · 1.125 → "1,125" · 1500.5 → "1.500,500"
 * Examples (trimTrailing=true):  20 → "20"     · 1.125 → "1,125" · 1500.5 → "1.500,5"
 */
export function formatQty(value: number, decimals = 3, trimTrailing = false): string {
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: trimTrailing ? 0 : decimals,
    maximumFractionDigits: decimals,
  })
}
