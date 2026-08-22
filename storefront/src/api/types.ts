/* ============================================================================
   Fuente de verdad del dominio de la tienda.
   Estos tipos NO los define el backend: si el ERP expone nombres distintos,
   la traducción ocurre exclusivamente dentro de httpStoreApi.
   ========================================================================== */

/** El ERP identifica las categorías por UUID; la tienda no fija su lista. */
export type CategoryId = string

export interface Category {
  id: CategoryId
  name: string
  /** Copy corto para la barra de filtro y el megamenú. */
  description: string
}

/** Una presentación es lo que realmente se compra: tiene precio y stock propios. */
export interface Presentation {
  id: string
  /** Ej. "Filete 500 g" */
  name: string
  /** Eje 1 del selector. Null cuando el grupo tiene una sola presentación. */
  axisPresentation: string | null
  /** Eje 2 del selector. Siempre presente. */
  axisSize: string
  /** Precio en pesos colombianos, sin decimales. Solo para mostrar. */
  price: number
  available: boolean
}

export interface Product {
  slug: string
  name: string
  categoryId: CategoryId
  /** Comunidad de origen. Ej. "Bahía Solano" */
  origin: string
  description: string
  /** Texto del acordeón de la ficha de producto. */
  conservation: string
  imageUrl: string
  imageAlt: string
  presentations: Presentation[]
  available: boolean
  /** Orden de aparición en la tienda; los 4 primeros van a destacados. */
  webSortOrder: number
}

export interface Catalog {
  categories: Category[]
  products: Product[]
}

/* ── Pedido ──────────────────────────────────────────────────────────────── */

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'BANK_TRANSFER'

export interface OrderCustomerInput {
  fullName: string
  document?: string
  phone: string
  email?: string
}

export interface OrderShippingInput {
  address: string
  city: string
  notes?: string
}

/** Solo identificadores y cantidades: el cliente nunca envía precios. */
export interface OrderItemInput {
  presentationId: string
  quantity: number
}

export interface CreateOrderInput {
  customer: OrderCustomerInput
  shipping: OrderShippingInput
  paymentMethod: PaymentMethod
  items: OrderItemInput[]
  /** Honeypot antispam: debe llegar vacío. */
  website: string
}

export interface OrderResult {
  /** Ej. "EP-2026-00042" */
  number: string
  trackingToken: string
  /** Totales calculados por el servidor; mandan sobre los del carrito. */
  subtotal: number
  shippingCost: number
  total: number
  status: OrderStatusStep
}

/**
 * Hitos que ve el cliente. Son los cuatro estados reales del ERP:
 * PENDING se presenta como "Recibido". CANCELLED se maneja aparte.
 */
export const ORDER_STEPS = [
  'RECEIVED',
  'PREPARING',
  'DISPATCHED',
  'DELIVERED',
] as const

export type OrderStatusStep = (typeof ORDER_STEPS)[number]

export const ORDER_STEP_LABELS: Record<OrderStatusStep, string> = {
  RECEIVED:   'Recibido',
  PREPARING:  'En preparación',
  DISPATCHED: 'Despachado',
  DELIVERED:  'Entregado',
}

/** El pedido cancelado no es un hito de la línea: se muestra aparte. */
export type OrderState = OrderStatusStep | 'CANCELLED'

export interface OrderLine {
  productName: string
  presentationName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderStatus {
  number: string
  status: OrderState
  placedAt: string
  customerName: string
  shippingCity: string
  paymentMethod: PaymentMethod
  lines: OrderLine[]
  subtotal: number
  shippingCost: number
  total: number
  cancelReason: string | null
}

/* ── Errores de dominio ──────────────────────────────────────────────────── */

/**
 * Falta de stock. En modo `api` corresponde a un 422 del ERP.
 * El checkout la usa para señalar el producto concreto y ofrecer quitarlo.
 */
export class InsufficientStockError extends Error {
  constructor(
    readonly presentationId: string,
    readonly productName: string,
    readonly presentationName: string,
  ) {
    super(`Sin stock suficiente de ${productName} — ${presentationName}`)
    this.name = 'InsufficientStockError'
  }
}

/** El enlace de seguimiento no existe o expiró. */
export class OrderNotFoundError extends Error {
  constructor() {
    super('No encontramos ese pedido')
    this.name = 'OrderNotFoundError'
  }
}
