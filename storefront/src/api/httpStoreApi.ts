import client from './client'
import {
  InsufficientStockError,
  OrderNotFoundError,
  type Catalog,
  type CreateOrderInput,
  type OrderResult,
  type OrderStatus,
  type Product,
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

export const httpStoreApi: StoreApi = {
  async getCatalog(): Promise<Catalog> {
    const { data } = await client.get<Catalog>('/api/v1/public/catalog')
    return { ...data, products: data.products.map(absoluteImage) }
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
