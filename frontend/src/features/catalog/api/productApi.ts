import client from '../../../api/client'
import type { PaginatedResponse, UnitOfMeasure, ProductType, ProductStatus } from '../../../shared/types'

export interface CategoryDto {
  id: string
  name: string
  description: string | null
}

export interface ProductDto {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
  unitOfMeasure: UnitOfMeasure
  minimumStock: number | null
  currentStock: number
  description: string | null
  active: boolean
  sku: string | null
  barcode: string | null
  productType: ProductType | null
  purchaseCost: number | null
  purchaseCostLast: number | null
  averageCost: number | null
  salePrice: number | null
  inventoryTrackingEnabled: boolean
  defaultWarehouse: string | null
  status: ProductStatus
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProductDto {
  name: string
  categoryId: string
  unitOfMeasure: UnitOfMeasure
  productType: ProductType
  salePrice: number
  defaultWarehouse: string
  minimumStock?: number | null
  description?: string | null
  sku?: string | null
  barcode?: string | null
  purchaseCost?: number | null
  inventoryTrackingEnabled?: boolean
  status?: ProductStatus
  imageUrl?: string | null
}

export const productApi = {
  listAll: async (page = 0, size = 200): Promise<PaginatedResponse<ProductDto>> => {
    const { data } = await client.get('/products', { params: { page, size, sort: 'name' } })
    return data
  },

  getById: async (id: string): Promise<ProductDto> => {
    const { data } = await client.get(`/products/${id}`)
    return data
  },

  create: async (req: CreateProductDto): Promise<ProductDto> => {
    const { data } = await client.post('/products', req)
    return data
  },

  update: async (id: string, req: CreateProductDto): Promise<ProductDto> => {
    const { data } = await client.put(`/products/${id}`, req)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/products/${id}`)
  },

  importBulk: async (requests: CreateProductDto[]): Promise<ProductDto[]> => {
    const { data } = await client.post('/products/import', requests)
    return data
  },
}

export const categoryApi = {
  listAll: async (): Promise<CategoryDto[]> => {
    const { data } = await client.get('/categories')
    return data
  },

  create: async (name: string, description?: string): Promise<CategoryDto> => {
    const { data } = await client.post('/categories', null, {
      params: { name, description },
    })
    return data
  },
}
