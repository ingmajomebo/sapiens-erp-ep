import type {
  Catalog,
  CategoryHero,
  CategoryPage,
  CreateOrderInput,
  OrderResult,
  OrderStatus,
  Product,
  StockRequestInput,
  StockRequestResult,
} from './types'

/**
 * Única puerta de datos de la tienda. Todos los componentes consumen esta
 * interfaz; ninguno importa Axios ni conoce rutas HTTP.
 */
export interface StoreApi {
  getCatalog(): Promise<Catalog>
  /** Portadas publicadas, para la navegación. */
  getCategories(): Promise<CategoryHero[]>
  /** Página completa de una categoría: portada, migas y presentaciones. */
  getCategoryPage(slug: string): Promise<CategoryPage>
  getProduct(slug: string): Promise<Product>
  createOrder(input: CreateOrderInput): Promise<OrderResult>
  trackOrder(token: string): Promise<OrderStatus>
  /** Registra el interés por una presentación sin existencias. */
  requestStock(input: StockRequestInput): Promise<StockRequestResult>
}

export type DataSource = 'mock' | 'api'

/** `mock` por defecto: la tienda arranca sin backend. */
export const DATA_SOURCE: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'

/*
 * Import estático de ambas implementaciones para que Vite resuelva el árbol
 * en build. La rama no elegida se descarta en producción por tree-shaking
 * solo si se fija VITE_DATA_SOURCE en tiempo de build.
 */
import { mockStoreApi } from './mockStoreApi'
import { httpStoreApi } from './httpStoreApi'

export const storeApi: StoreApi = DATA_SOURCE === 'api' ? httpStoreApi : mockStoreApi
