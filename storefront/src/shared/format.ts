/** Formato de precio de la tienda: "$ 48.900", sin decimales. */
const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  return COP.format(value)
}

const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  return LONG_DATE.format(new Date(iso))
}
