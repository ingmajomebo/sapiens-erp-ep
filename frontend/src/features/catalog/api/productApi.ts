import client, { API_BASE } from '../../../api/client'
import type { PaginatedResponse, UnitOfMeasure, ProductType, ProductStatus } from '../../../shared/types'

/**
 * Resuelve la URL de imagen para usarla en <img src>: las imágenes subidas se
 * guardan como ruta relativa (/api/v1/products/{id}/image) y en producción el
 * backend vive en otro dominio, así que hay que anteponer API_BASE.
 */
export function productImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  return imageUrl.startsWith('/') ? `${API_BASE}${imageUrl}` : imageUrl
}

export interface CategoryDto {
  id: string
  name: string
  description: string | null
}

export interface SubcategoryDto {
  id: string
  categoryId: string
  categoryName: string
  name: string
  description: string | null
}

export interface ProductDto {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
  subcategoryId: string | null
  subcategoryName: string | null
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
  /** Puede consumirse en una transformación (sale del inventario). */
  transformationInputEnabled: boolean
  /** Puede obtenerse de una transformación (entra al inventario). */
  transformationOutputEnabled: boolean
  defaultWarehouse: string | null
  warehouseId: string | null
  warehouseName: string | null
  status: ProductStatus
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProductDto {
  name: string
  categoryId: string
  /** Opcional. Debe pertenecer a categoryId o el backend rechaza con 400. */
  subcategoryId?: string | null
  unitOfMeasure: UnitOfMeasure
  productType: ProductType
  salePrice: number
  defaultWarehouse: string
  warehouseId?: string | null
  minimumStock?: number | null
  description?: string | null
  sku?: string | null
  barcode?: string | null
  purchaseCost?: number | null
  inventoryTrackingEnabled?: boolean
  transformationInputEnabled?: boolean
  transformationOutputEnabled?: boolean
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

  uploadImage: async (id: string, file: File): Promise<ProductDto> => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await client.post(`/products/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deleteImage: async (id: string): Promise<ProductDto> => {
    const { data } = await client.delete(`/products/${id}/image`)
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

export const subcategoryApi = {
  /** Sin categoryId devuelve todas; con él, solo las de esa categoría. */
  listAll: async (categoryId?: string): Promise<SubcategoryDto[]> => {
    const { data } = await client.get('/subcategories', {
      params: categoryId ? { categoryId } : undefined,
    })
    return data
  },

  create: async (categoryId: string, name: string, description?: string): Promise<SubcategoryDto> => {
    const { data } = await client.post('/subcategories', null, {
      params: { categoryId, name, description },
    })
    return data
  },
}
