/* ============================================================================
   Datos verificados de la marca. Fuente: Brand Guideline (Sapiens Studio),
   secciones de identidad y aplicaciones. No inventar nada aquí.
   ========================================================================== */

export const BRAND = {
  name: 'Encanto Pacífico',
  tagline: 'Del mar a tu mesa',
  /** Bio oficial, tomada del mockup de Instagram del brand book. */
  description:
    'Sabores del mar, recetas con tradición y productos artesanales del Pacífico colombiano.',
  phone: '+57 322 272 3808',
  phoneHref: '+573222723808',
  email: 'info@encantopacifico.com',
  city: 'Medellín, Colombia',
  site: 'encantopacifico.com',
  instagram: 'encanto_pacifico',
  instagramUrl: 'https://instagram.com/encanto_pacifico',
} as const

/**
 * Sello impreso en la caja de envío. Texto literal del brand book.
 */
export const QUALITY_SEAL = {
  top: 'Garantía de calidad',
  center: 'Fresco',
  bottom: '100% producto de pesca artesanal',
} as const

/**
 * Los cuatro pilares, con los textos exactos del mockup oficial de la web
 * incluido en el brand book. No cambiarlos.
 */
export const PILLARS = [
  { id: 'origen',         title: 'Origen',         text: 'Directo del Pacífico colombiano.' },
  { id: 'frescura',       title: 'Frescura',       text: 'Procesos que conservan su sabor natural.' },
  { id: 'sostenibilidad', title: 'Sostenibilidad', text: 'Comprometidos con el mar y nuestras comunidades.' },
  { id: 'calidad',        title: 'Calidad',        text: 'Selección cuidadosa para los mejores resultados.' },
] as const
