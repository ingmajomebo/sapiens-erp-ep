import { MOCK_CATALOG } from './catalog.mock'
import { calculateShipping } from './shipping'
import {
  InsufficientStockError,
  OrderNotFoundError,
  type Availability,
  type Catalog,
  type CatalogItem,
  type CategoryHero,
  type CategoryPage,
  type CreateOrderInput,
  type OrderLine,
  type OrderResult,
  type OrderStatus,
  type Product,
  type StockRequestResult,
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

/**
 * Deriva las portadas del catálogo simulado: una por categoría y una por
 * producto. En modo `mock` no hay tabla de portadas, así que se construye a
 * partir de lo que ya existe en vez de duplicar contenido a mano.
 */
function mockCategories(): CategoryHero[] {
  const raiz: CategoryHero[] = MOCK_CATALOG.categories.map(c => ({
    slug: slugOf(c.name),
    kind: 'CATEGORY',
    parentSlug: null,
    title: c.name,
    description: c.description,
    bannerUrl: null,
    bannerAlt: c.name,
  }))

  const especies: CategoryHero[] = MOCK_CATALOG.products.map(p => ({
    slug: p.slug,
    kind: 'SPECIES',
    parentSlug: slugOf(
      MOCK_CATALOG.categories.find(c => c.id === p.categoryId)?.name ?? '',
    ),
    title: p.name,
    description: p.description,
    bannerUrl: p.imageUrl,
    bannerAlt: p.imageAlt,
  }))

  return [...raiz, ...especies]
}

function slugOf(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Convierte un producto simulado en sus presentaciones como ítems del catálogo. */
function mockItems(products: Product[]): CatalogItem[] {
  return products.flatMap(p =>
    p.presentations.map((pr, i) => ({
      id: pr.id,
      slug: `${p.slug}-${i}`,
      groupSlug: p.slug,
      groupName: p.name,
      variantName: pr.name,
      axisPresentation: pr.axisPresentation,
      axisSize: pr.axisSize,
      price: pr.price,
      pricePerKg: null,
      weightValue: null,
      weightUnit: null,
      origin: p.origin,
      originKind: null,
      imageUrl: p.imageUrl,
      secondaryImageUrl: null,
      imageAlt: p.imageAlt,
      availability: (pr.available ? 'AVAILABLE' : 'OUT_OF_STOCK') as Availability,
      attributes: (pr.axisPresentation
        ? { presentacion: [pr.axisPresentation] }
        : {}) as Record<string, string[]>,
      categoryId: p.categoryId,
      categoryName: MOCK_CATALOG.categories.find(c => c.id === p.categoryId)?.name ?? null,
      subcategoryId: null,
      subcategoryName: null,
      sortOrder: p.webSortOrder,
      publishedAt: new Date(0).toISOString(),
    })),
  )
}

export const mockStoreApi: StoreApi = {
  async getCatalog(): Promise<Catalog> {
    return delay(MOCK_CATALOG)
  },

  async getCategories(): Promise<CategoryHero[]> {
    return delay(mockCategories())
  },

  async getCategoryPage(slug: string): Promise<CategoryPage> {
    const hero = mockCategories().find(c => c.slug === slug)
    if (!hero) throw new Error(`Categoría no encontrada: ${slug}`)

    const alcance =
      hero.kind === 'SPECIES'
        ? MOCK_CATALOG.products.filter(p => p.slug === slug)
        : MOCK_CATALOG.products.filter(
            p => slugOf(MOCK_CATALOG.categories.find(c => c.id === p.categoryId)?.name ?? '') === slug,
          )

    return delay({
      hero,
      breadcrumbs: [
        { label: 'Inicio', path: '/' },
        ...(hero.parentSlug ? [{ label: hero.parentSlug, path: `/${hero.parentSlug}` }] : []),
        { label: hero.title, path: hero.parentSlug ? `/${hero.parentSlug}/${slug}` : `/${slug}` },
      ],
      items: mockItems(alcance),
      attributeDefinitions: [
        { key: 'presentacion', label: 'Presentación', filterable: true, sortOrder: 10 },
      ],
      children: mockCategories().filter(c => c.parentSlug === slug),
    })
  },

  async requestStock(): Promise<StockRequestResult> {
    return delay({ id: crypto.randomUUID(), status: 'WAITING_STOCK', alreadyRegistered: false })
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
