import client from './client'
import {
  InsufficientStockError,
  OrderNotFoundError,
  type Catalog,
  type CatalogItem,
  type CategoryHero,
  type CategoryPage,
  type CreateOrderInput,
  type OrderResult,
  type OrderStatus,
  type Product,
  type StockRequestInput,
  type StockRequestResult,
} from './types'
import type { StoreApi } from './storeApi'

/* ============================================================================
   Implementación contra el ERP.
   Este archivo es la ÚNICA frontera con la forma real de la API: si el
   backend cambia nombres de campos, se traduce aquí y ningún componente
   se entera.
   ========================================================================== */

/** Respuesta cruda del ERP. Se mantiene separada de los tipos de dominio. */
interface ApiErrorBody {
  status?: number
  error?: string
  message?: string
  /** El ERP identifica la presentación sin stock en el 422. */
  presentationId?: string
  productName?: string
  presentationName?: string
}

function isAxiosStatus(err: unknown, status: number): err is { response: { status: number; data: ApiErrorBody } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === status
  )
}

/**
 * El ERP guarda la imagen como ruta relativa (/api/v1/products/{id}/image).
 * La tienda corre en otro origen, así que hay que anteponer la base o el
 * navegador la buscaría contra sí mismo. Traducir aquí, nunca en un componente.
 */
function absoluteImage<T extends { imageUrl: string | null }>(item: T): T {
  const base = import.meta.env.VITE_API_URL ?? ''
  if (!item.imageUrl || !item.imageUrl.startsWith('/')) return item
  return { ...item, imageUrl: `${base}${item.imageUrl}` }
}

/**
 * Las presentaciones traen DOS imágenes relativas. La segunda solo existe
 * cuando se cargó una foto de hover, y ahí `null` es un dato con significado:
 * la tarjeta no debe animar nada.
 */
/**
 * Ancho que pide la rejilla. Las tarjetas se pintan a unos 300 px; el original
 * mide 1000 y pesa hasta 380 KB. Se pide 400 para que en pantallas de doble
 * densidad siga viéndose nítido.
 */
const GRID_WIDTH = 400

function absoluteItemImages(item: CatalogItem): CatalogItem {
  const base = import.meta.env.VITE_API_URL ?? ''
  const abs = (url: string | null) => {
    if (!url || !url.startsWith('/api/')) return url
    return `${base}${url}?w=${GRID_WIDTH}`
  }
  return { ...item, imageUrl: abs(item.imageUrl), secondaryImageUrl: abs(item.secondaryImageUrl) }
}

export const httpStoreApi: StoreApi = {
  async getCatalog(): Promise<Catalog> {
    const { data } = await client.get<Catalog>('/api/v1/public/catalog')
    return { ...data, products: data.products.map(absoluteImage) }
  },

  async getCategories(): Promise<CategoryHero[]> {
    const { data } = await client.get<CategoryHero[]>('/api/v1/public/catalog/categories')
    return data
  },

  async getCategoryPage(slug: string): Promise<CategoryPage> {
    const { data } = await client.get<CategoryPage>(`/api/v1/public/catalog/categories/${slug}`)
    return { ...data, items: data.items.map(absoluteItemImages) }
  },

  async requestStock(input: StockRequestInput): Promise<StockRequestResult> {
    const { data } = await client.post<StockRequestResult>('/api/v1/public/stock-requests', input)
    return data
  },

  async getProduct(slug: string): Promise<Product> {
    const { data } = await client.get<Product>(`/api/v1/public/catalog/${slug}`)
    return absoluteImage(data)
  },

  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    try {
      const { data } = await client.post<OrderResult>('/api/v1/public/orders', input)
      return data
    } catch (err: unknown) {
      // 422 = stock insuficiente. Se traduce al error de dominio para que
      // el checkout pueda señalar el producto y ofrecer quitarlo.
      if (isAxiosStatus(err, 422)) {
        const body = err.response.data
        throw new InsufficientStockError(
          body.presentationId ?? '',
          body.productName ?? 'Un producto de tu pedido',
          body.presentationName ?? '',
        )
      }
      throw err
    }
  },

  async trackOrder(token: string): Promise<OrderStatus> {
    try {
      const { data } = await client.get<OrderStatus>(`/api/v1/public/orders/track/${token}`)
      return data
    } catch (err: unknown) {
      if (isAxiosStatus(err, 404)) throw new OrderNotFoundError()
      throw err
    }
  },
}
