import type { Catalog, Category, Product } from './types'

/* ============================================================================
   Catálogo de demostración. Productos, presentaciones, precios y comunidades
   de origen reales de Encanto Pacífico.
   Pargo entero y Piangua quedan agotados a propósito para poder probar
   el estado "Agotado" en tarjeta y ficha.
   ========================================================================== */

export const CATEGORIES: Category[] = [
  { id: 'pescados', name: 'Pescados',              description: 'Del mar, con línea de mano' },
  { id: 'mariscos', name: 'Mariscos',              description: 'Camarón, langosta y concha' },
  { id: 'despensa', name: 'Despensa del Pacífico', description: 'De la tierra del Chocó' },
]

export const PRODUCTS: Product[] = [
  {
    slug: 'pargo-rojo',
    name: 'Pargo rojo',
    categoryId: 'pescados',
    origin: 'Bahía Solano',
    description:
      'Carne blanca, firme y de sabor suave. Se pesca con línea de mano frente a Bahía Solano y llega empacado al vacío el mismo día que sale del agua.',
    conservation: 'Mantener congelado a -18 °C. Una vez descongelado, consumir dentro de 24 horas y no volver a congelar.',
    imageUrl: '/img/producto-pargo-rojo.jpg',
    imageAlt: 'Filete de pargo rojo fresco sobre hielo',
    presentations: [
      { id: 'pargo-rojo-filete-500', name: 'Filete 500 g', axisPresentation: 'Filete', axisSize: '500 g', price: 48_900, available: true },
      { id: 'pargo-rojo-entero-1k',  name: 'Entero 1 kg',  axisPresentation: 'Entero', axisSize: '1 kg',  price: 79_900, available: false },
    ],
    available: true,
    webSortOrder: 1,
  },
  {
    slug: 'corvina',
    name: 'Corvina',
    categoryId: 'pescados',
    origin: 'Nuquí',
    description:
      'De textura magra y sabor delicado, es la favorita para encocados y ceviches. Capturada por pescadores de Nuquí.',
    conservation: 'Mantener congelado a -18 °C. Descongelar en refrigeración, nunca a temperatura ambiente.',
    imageUrl: '/img/producto-corvina.jpg',
    imageAlt: 'Filete de corvina fresca',
    presentations: [
      { id: 'corvina-filete-500', name: 'Filete 500 g', axisPresentation: 'Filete', axisSize: '500 g', price: 42_900, available: true },
      { id: 'corvina-postas-800', name: 'Postas 800 g', axisPresentation: 'Postas', axisSize: '800 g', price: 58_900, available: true },
    ],
    available: true,
    webSortOrder: 2,
  },
  {
    slug: 'camaron-tigre',
    name: 'Camarón tigre',
    categoryId: 'mariscos',
    origin: 'Buenaventura',
    description:
      'Camarón grande de aguas del Pacífico, pelado y desvenado. Listo para el sartén o para un ceviche.',
    conservation: 'Mantener congelado a -18 °C. Consumir dentro de 24 horas tras descongelar.',
    imageUrl: '/img/producto-camaron-tigre.jpg',
    imageAlt: 'Camarones tigre pelados del Pacífico',
    presentations: [
      { id: 'camaron-tigre-500', name: 'Pelado 500 g', axisPresentation: 'Pelado', axisSize: '500 g', price: 61_900,  available: true },
      { id: 'camaron-tigre-1k',  name: 'Pelado 1 kg',  axisPresentation: 'Pelado', axisSize: '1 kg',  price: 115_900, available: true },
    ],
    available: true,
    webSortOrder: 3,
  },
  {
    slug: 'cola-de-langosta',
    name: 'Cola de langosta',
    categoryId: 'mariscos',
    origin: 'Bahía Solano',
    description:
      'Langosta espinosa del Pacífico, capturada a pulmón por buzos artesanales. Producto de temporada.',
    conservation: 'Mantener congelado a -18 °C. Cocinar directamente desde congelado para conservar la textura.',
    imageUrl: '/img/producto-cola-langosta.jpg',
    imageAlt: 'Colas de langosta del Pacífico colombiano',
    presentations: [
      { id: 'cola-langosta-2u', name: '2 unidades', axisPresentation: null, axisSize: '2 unidades', price: 94_900, available: true },
    ],
    available: true,
    webSortOrder: 4,
  },
  {
    slug: 'robalo',
    name: 'Róbalo',
    categoryId: 'pescados',
    origin: 'Bahía Solano',
    description:
      'Uno de los pescados más apreciados del Pacífico: carne blanca, jugosa y de sabor limpio.',
    conservation: 'Mantener congelado a -18 °C. Descongelar en refrigeración durante la noche.',
    imageUrl: '/img/producto-robalo.jpg',
    imageAlt: 'Filete de róbalo fresco',
    presentations: [
      { id: 'robalo-filete-500', name: 'Filete 500 g', axisPresentation: 'Filete', axisSize: '500 g', price: 56_900, available: true },
    ],
    available: true,
    webSortOrder: 5,
  },
  {
    slug: 'atun',
    name: 'Atún',
    categoryId: 'pescados',
    origin: 'Bahía Solano',
    description:
      'Lomo de atún de aleta amarilla, corte limpio y color intenso. Ideal para sellar o para tartar.',
    conservation: 'Mantener congelado a -18 °C. Para consumo crudo, descongelar en refrigeración y usar el mismo día.',
    imageUrl: '/img/producto-atun.jpg',
    imageAlt: 'Lomo de atún de aleta amarilla',
    presentations: [
      { id: 'atun-lomo-400', name: 'Lomo 400 g', axisPresentation: 'Lomo', axisSize: '400 g', price: 52_900, available: true },
    ],
    available: true,
    webSortOrder: 6,
  },
  {
    slug: 'sierra',
    name: 'Sierra',
    categoryId: 'pescados',
    origin: 'Nuquí',
    description:
      'Pescado de sabor pronunciado y carne firme. Muy usado en preparaciones ahumadas y a la parrilla.',
    conservation: 'Mantener congelado a -18 °C. No volver a congelar tras descongelar.',
    imageUrl: '/img/producto-sierra.jpg',
    imageAlt: 'Filete de sierra del Pacífico',
    presentations: [
      { id: 'sierra-filete-500', name: 'Filete 500 g', axisPresentation: 'Filete', axisSize: '500 g', price: 34_900, available: true },
    ],
    available: true,
    webSortOrder: 7,
  },
  {
    slug: 'bagre-de-mar',
    name: 'Bagre de mar',
    categoryId: 'pescados',
    origin: 'Buenaventura',
    description:
      'Carne suave y sin espinas, en postas gruesas. La base del sancocho de pescado del Pacífico.',
    conservation: 'Mantener congelado a -18 °C. Descongelar en refrigeración.',
    imageUrl: '/img/producto-bagre-de-mar.jpg',
    imageAlt: 'Postas de bagre de mar',
    presentations: [
      { id: 'bagre-postas-700', name: 'Postas 700 g', axisPresentation: 'Postas', axisSize: '700 g', price: 36_900, available: true },
    ],
    available: true,
    webSortOrder: 8,
  },
  {
    slug: 'pulpo',
    name: 'Pulpo',
    categoryId: 'mariscos',
    origin: 'Nuquí',
    description:
      'Pulpo limpio y porcionado, listo para cocinar. Capturado por buzos artesanales de Nuquí.',
    conservation: 'Mantener congelado a -18 °C. La congelación mejora su terneza.',
    imageUrl: '/img/producto-pulpo.jpg',
    imageAlt: 'Pulpo limpio del Pacífico',
    presentations: [
      { id: 'pulpo-limpio-800', name: 'Limpio 800 g', axisPresentation: 'Limpio', axisSize: '800 g', price: 72_900, available: true },
    ],
    available: true,
    webSortOrder: 9,
  },
  {
    slug: 'piangua',
    name: 'Piangua',
    categoryId: 'mariscos',
    origin: 'Bahía Málaga',
    description:
      'Molusco de manglar recolectado a mano por las piangüeras de Bahía Málaga. Sabor profundo y salino.',
    conservation: 'Mantener congelado a -18 °C. Consumir dentro de 24 horas tras descongelar.',
    imageUrl: '/img/producto-piangua.jpg',
    imageAlt: 'Piangua de manglar de Bahía Málaga',
    presentations: [
      { id: 'piangua-500', name: '500 g', axisPresentation: null, axisSize: '500 g', price: 28_900, available: false },
    ],
    available: false,
    webSortOrder: 10,
  },
  {
    slug: 'aceite-de-coco',
    name: 'Aceite de coco',
    categoryId: 'despensa',
    origin: 'Chocó',
    description:
      'Aceite de coco virgen extraído en frío por productoras del Chocó. Sin refinar y sin aditivos.',
    conservation: 'Conservar en lugar fresco y seco, lejos de la luz directa. No requiere refrigeración.',
    imageUrl: '/img/producto-aceite-de-coco.jpg',
    imageAlt: 'Frasco de aceite de coco virgen del Chocó',
    presentations: [
      { id: 'aceite-coco-500ml', name: 'Frasco 500 ml', axisPresentation: 'Frasco', axisSize: '500 ml', price: 32_900, available: true },
    ],
    available: true,
    webSortOrder: 11,
  },
  {
    slug: 'achiote',
    name: 'Achiote',
    categoryId: 'despensa',
    origin: 'Chocó',
    description:
      'Achiote molido de cultivo tradicional chocoano. Da color y aroma a arroces, guisos y encocados.',
    conservation: 'Conservar en lugar fresco y seco, en su frasco bien cerrado.',
    imageUrl: '/img/producto-achiote.jpg',
    imageAlt: 'Frasco de achiote molido del Chocó',
    presentations: [
      { id: 'achiote-250', name: 'Frasco 250 g', axisPresentation: 'Frasco', axisSize: '250 g', price: 18_900, available: true },
    ],
    available: true,
    webSortOrder: 12,
  },
]

export const MOCK_CATALOG: Catalog = {
  categories: CATEGORIES,
  products: PRODUCTS,
}
