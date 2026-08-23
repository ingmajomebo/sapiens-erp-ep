/* ============================================================================
   Cobertura de entrega — fuente única de verdad.

   La usan el mapa de la página de envíos, el cálculo del costo y el selector
   de ciudad del checkout. Tenerla en un solo sitio evita el peor error
   posible: cobrar como nacional un municipio que sí cubrimos, o prometer en
   la página una ciudad donde el checkout no deja terminar la compra.

   Al habilitar una ciudad nueva basta agregarla aquí.
   ========================================================================== */

export type ZoneId = 'aburra' | 'oriente'

export interface Zone {
  id: ZoneId
  name: string
  note: string
}

export const ZONES: Zone[] = [
  {
    id: 'aburra',
    name: 'Valle de Aburrá',
    note: 'Seis municipios del área metropolitana.',
  },
  {
    id: 'oriente',
    name: 'Oriente antioqueño',
    note: 'Al otro lado de la cordillera, sobre el altiplano.',
  },
]

export interface CoveredCity {
  /** Nombre como se muestra y como se guarda en el pedido. */
  name: string
  zone: ZoneId
  /** Posición en el mapa esquemático (viewBox 0 0 320 320). */
  x: number
  y: number
  /** Cabecera municipal o corregimiento: cambia cómo se rotula. */
  kind: 'municipio' | 'corregimiento'
}

/**
 * Los ocho municipios con cobertura hoy. El orden es de norte a sur dentro de
 * cada zona, que es como se arma la ruta del despacho.
 */
export const COVERED_CITIES: CoveredCity[] = [
  { name: 'Bello',       zone: 'aburra',  x: 118, y:  96, kind: 'municipio' },
  { name: 'Medellín',    zone: 'aburra',  x: 128, y: 136, kind: 'municipio' },
  { name: 'Envigado',    zone: 'aburra',  x: 140, y: 182, kind: 'municipio' },
  { name: 'Itagüí',      zone: 'aburra',  x: 116, y: 190, kind: 'municipio' },
  { name: 'Sabaneta',    zone: 'aburra',  x: 134, y: 214, kind: 'municipio' },
  { name: 'La Estrella', zone: 'aburra',  x: 108, y: 226, kind: 'municipio' },
  { name: 'Rionegro',    zone: 'oriente', x: 236, y: 172, kind: 'municipio' },
  { name: 'Llano Grande',zone: 'oriente', x: 250, y: 200, kind: 'corregimiento' },
]

/** Tolera tildes, mayúsculas y espacios sobrantes al comparar. */
export function normalizeCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const COVERED_KEYS = new Set(COVERED_CITIES.map(c => normalizeCity(c.name)))

export function isCovered(city: string): boolean {
  return COVERED_KEYS.has(normalizeCity(city))
}

export function zoneOf(city: string): ZoneId | null {
  const key = normalizeCity(city)
  return COVERED_CITIES.find(c => normalizeCity(c.name) === key)?.zone ?? null
}

export function citiesOfZone(zone: ZoneId): CoveredCity[] {
  return COVERED_CITIES.filter(c => c.zone === zone)
}
