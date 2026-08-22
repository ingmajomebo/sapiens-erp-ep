/** Contenido del megamenú. Solo tipografía: sin iconos, precios ni badges. */

export interface MegaColumn {
  heading: string
  links: string[]
  /** Ruta del enlace "Ver todos". Ausente en la columna "Comprar por". */
  seeAllHref?: string
}

export const MEGA_COLUMNS: MegaColumn[] = [
  {
    heading: 'Pescados',
    links: ['Pargo rojo', 'Corvina', 'Bagre de mar', 'Sierra', 'Atún', 'Róbalo', 'Merluza', 'Dorado'],
    seeAllHref: '/productos?categoria=pescados',
  },
  {
    heading: 'Mariscos',
    links: ['Camarón', 'Cola de langosta', 'Pulpo', 'Calamar', 'Piangua', 'Jaiba', 'Almeja'],
    seeAllHref: '/productos?categoria=mariscos',
  },
  {
    heading: 'Despensa del Pacífico',
    links: ['Aceite de coco', 'Achiote', 'Leche de coco', 'Hierbas de azotea'],
    seeAllHref: '/productos?categoria=despensa',
  },
  {
    heading: 'Comprar por',
    links: ['Corte', 'Ocasión', 'Cajas y combos', 'Novedades'],
  },
]

export const MEGA_FEATURED = {
  tag: 'Temporada',
  title: 'Langosta de Bahía Solano',
  href: '/productos/cola-de-langosta',
  image: '/img/megamenu-langosta-temporada.jpg',
  imageAlt: 'Cola de langosta del Pacífico sobre arena volcánica',
}

/** Convierte "Pargo rojo" en "/productos/pargo-rojo". */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
