import client from '../../../api/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SalesOrderStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'
export type SalesChannel = 'PUBLIC' | 'ADMIN'

export interface SalesOrderLineDto {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface SalesOrderDto {
  id: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerAnonymous: boolean
  channel: SalesChannel
  status: SalesOrderStatus
  createdBy: string | null
  notes: string | null
  total: number
  lines: SalesOrderLineDto[]
  createdAt: string
}

export interface CustomerDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  anonymous: boolean
  createdAt: string
}

export interface SalesOrderLinkDto {
  id: string
  token: string
  label: string | null
  active: boolean
  createdAt: string
}

export interface CreateSalesOrderDto {
  customerId?: string | null
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  lines: { productId: string; quantity: number }[]
}

export interface PublicProductDto {
  id: string
  name: string
  unitOfMeasure: string
  salePrice: number
  imageUrl: string | null
}

export interface PublicCatalogDto {
  label: string | null
  products: PublicProductDto[]
}

// ─── API canal administrativo ─────────────────────────────────────────────────

export const salesOrderApi = {
  list: async (status?: string): Promise<SalesOrderDto[]> => {
    const { data } = await client.get('/sales-orders', { params: status ? { status } : {} })
    return data
  },

  getById: async (id: string): Promise<SalesOrderDto> => {
    const { data } = await client.get(`/sales-orders/${id}`)
    return data
  },

  create: async (req: CreateSalesOrderDto): Promise<SalesOrderDto> => {
    const { data } = await client.post('/sales-orders', req)
    return data
  },

  updateStatus: async (id: string, status: SalesOrderStatus): Promise<SalesOrderDto> => {
    const { data } = await client.patch(`/sales-orders/${id}/status`, null, { params: { status } })
    return data
  },
}

export const customerApi = {
  listAll: async (): Promise<CustomerDto[]> => {
    const { data } = await client.get('/customers')
    return data
  },

  create: async (req: { name: string; email?: string; phone?: string }): Promise<CustomerDto> => {
    const { data } = await client.post('/customers', req)
    return data
  },
}

export const salesLinkApi = {
  listAll: async (): Promise<SalesOrderLinkDto[]> => {
    const { data } = await client.get('/sales-order-links')
    return data
  },

  create: async (label?: string): Promise<SalesOrderLinkDto> => {
    const { data } = await client.post('/sales-order-links', { label: label ?? null })
    return data
  },

  toggle: async (id: string): Promise<SalesOrderLinkDto> => {
    const { data } = await client.patch(`/sales-order-links/${id}/toggle`)
    return data
  },
}

// ─── API canal público (sin autenticación; validado por token del enlace) ────

export const publicOrderApi = {
  catalog: async (token: string): Promise<PublicCatalogDto> => {
    const { data } = await client.get(`/public/orders/${token}`)
    return data
  },

  create: async (token: string, req: Omit<CreateSalesOrderDto, 'customerId'>): Promise<SalesOrderDto> => {
    const { data } = await client.post(`/public/orders/${token}`, req)
    return data
  },
}
