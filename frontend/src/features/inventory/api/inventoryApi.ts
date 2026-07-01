import client from '../../../api/client'
import type { PaginatedResponse, MovementType, UnitOfMeasure, StockStatus } from '../../../shared/types'

export interface StockDto {
  productId: string
  productName: string
  unitOfMeasure: UnitOfMeasure
  currentStock: number
  minimumStock: number
  stockStatus: StockStatus
}

export interface MovementDto {
  id: string
  productId: string
  productName: string
  movementType: MovementType
  quantity: number
  unitCost: number | null
  reason: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface LotDto {
  id: string
  productId: string
  productName: string
  originalQuantity: number
  availableQuantity: number
  purchasePrice: number
  receivedAt: string
  expiresAt: string | null
  invoiceNumber: string | null
  notes: string | null
  createdAt: string
}

export interface CreateEntryDto {
  productId: string
  quantity: number
  purchasePrice: number
  receivedAt?: string | null
  expiresAt?: string | null
  invoiceNumber?: string | null
  notes?: string | null
  createdBy?: string | null
}

export const inventoryApi = {
  listStock: async (page = 0, size = 200): Promise<PaginatedResponse<StockDto>> => {
    const { data } = await client.get('/inventory/stock', { params: { page, size } })
    return data
  },

  getMovements: async (page = 0, size = 50, productId?: string): Promise<PaginatedResponse<MovementDto>> => {
    const { data } = await client.get('/inventory/movements', {
      params: { page, size, sort: 'createdAt,desc', ...(productId ? { productId } : {}) },
    })
    return data
  },

  getLots: async (productId: string): Promise<LotDto[]> => {
    const { data } = await client.get(`/inventory/lots/${productId}`)
    return data
  },

  getExpiringLots: async (days = 3): Promise<LotDto[]> => {
    const { data } = await client.get('/inventory/lots/expiring', { params: { days } })
    return data
  },

  createEntry: async (req: CreateEntryDto): Promise<MovementDto> => {
    const { data } = await client.post('/inventory/entries', req)
    return data
  },
}
