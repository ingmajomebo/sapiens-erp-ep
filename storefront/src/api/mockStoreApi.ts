import { MOCK_CATALOG } from './catalog.mock'
import { calculateShipping } from './shipping'
import {
  InsufficientStockError,
  OrderNotFoundError,
  type Catalog,
  type CreateOrderInput,
  type OrderLine,
  type OrderResult,
  type OrderStatus,
  type Product,
} from './types'
import type { StoreApi } from './storeApi'

/* ============================================================================
   Implementación local: permite construir y probar la tienda entera sin
   backend. Los pedidos se guardan en localStorage para que el seguimiento
   funcione de verdad tras un refresco.
   ========================================================================== */

const LATENCY_MS = 300
const ORDERS_KEY = 'encanto-mock-orders'

function delay<T>(value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS))
}

function readOrders(): Record<string, OrderStatus> {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, OrderStatus>) : {}
  } catch {
    // Un localStorage corrupto no debe tumbar la tienda
    return {}
  }
}

function writeOrders(orders: Record<string, OrderStatus>): void {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

/** Consecutivo por año, en el formato del ERP: EP-2026-00042 */
function nextOrderNumber(existing: number): string {
  const year = new Date().getFullYear()
  return `EP-${year}-${String(existing + 1).padStart(5, '0')}`
}

function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface ResolvedPresentation {
  product: Product
  presentationId: string
  presentationName: string
  unitPrice: number
  available: boolean
}

function resolvePresentation(presentationId: string): ResolvedPresentation | null {
  for (const product of MOCK_CATALOG.products) {
    const presentation = product.presentations.find(p => p.id === presentationId)
    if (presentation) {
      return {
        product,
        presentationId,
        presentationName: presentation.name,
        unitPrice: presentation.price,
        available: presentation.available && product.available,
      }
    }
  }
  return null
}

export const mockStoreApi: StoreApi = {
  async getCatalog(): Promise<Catalog> {
    return delay(MOCK_CATALOG)
  },

  async getProduct(slug: string): Promise<Product> {
    const product = MOCK_CATALOG.products.find(p => p.slug === slug)
    if (!product) throw new Error(`Producto no encontrado: ${slug}`)
    return delay(product)
  },

  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    // El honeypot descarta bots sin darles señal de que fueron detectados
    if (input.website.trim() !== '') {
      return delay({
        number: nextOrderNumber(0),
        trackingToken: randomToken(),
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        status: 'RECEIVED',
      })
    }

    const lines: OrderLine[] = []
    for (const item of input.items) {
      const resolved = resolvePresentation(item.presentationId)
      if (!resolved) throw new Error(`Presentación desconocida: ${item.presentationId}`)
      if (!resolved.available) {
        throw new InsufficientStockError(
          resolved.presentationId,
          resolved.product.name,
          resolved.presentationName,
        )
      }
      lines.push({
        productName: resolved.product.name,
        presentationName: resolved.presentationName,
        quantity: item.quantity,
        unitPrice: resolved.unitPrice,
        lineTotal: resolved.unitPrice * item.quantity,
      })
    }

    // El servidor recalcula: los precios del carrito nunca se usan aquí
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const shippingCost = calculateShipping(input.shipping.city, subtotal)

    const orders = readOrders()
    const order: OrderStatus = {
      number: nextOrderNumber(Object.keys(orders).length),
      status: 'RECEIVED',
      placedAt: new Date().toISOString(),
      customerName: input.customer.fullName,
      shippingCity: input.shipping.city,
      paymentMethod: input.paymentMethod,
      lines,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      cancelReason: null,
    }

    const trackingToken = randomToken()
    orders[trackingToken] = order
    writeOrders(orders)

    return delay({
      number: order.number,
      trackingToken,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      status: 'RECEIVED',
    })
  },

  async trackOrder(token: string): Promise<OrderStatus> {
    const order = readOrders()[token]
    if (!order) throw new OrderNotFoundError()
    return delay(order)
  },
}
