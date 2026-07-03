import client from '../../../api/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DocumentType = 'NIT' | 'CC' | 'CE' | 'PASSPORT'
export type CustomerSegment = 'NEW' | 'RECURRING' | 'AT_RISK' | 'INACTIVE'

export interface CustomerListItemDto {
  id: string
  name: string
  legalName: string | null
  documentType: DocumentType | null
  documentNumber: string | null
  email: string | null
  phone: string | null
  city: string | null
  defaultPaymentTermDays: number | null
  anonymous: boolean
  createdAt: string
  totalPurchases: number
  totalInvoiced: number
  avgTicket: number
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
  daysSinceLastPurchase: number | null
  avgFrequencyDays: number | null
  pendingBalance: number
  segment: CustomerSegment
}

export interface PurchaseHistoryItemDto {
  orderId: string
  orderNumber: string
  orderStatus: string
  orderDate: string
  total: number
  invoiceId: string | null
  invoiceNumber: string | null
  invoiceStatus: string | null
}

export interface MonthlyTotalDto {
  month: string
  total: number
}

export interface CustomerDetailDto {
  customer: CustomerListItemDto
  address: string | null
  notes: string | null
  purchases: PurchaseHistoryItemDto[]
  monthlyTotals: MonthlyTotalDto[]
}

export interface CustomerSummaryDto {
  total: number
  bySegment: Record<CustomerSegment, number>
  totalPendingBalance: number
}

export interface CustomerUpsertRequest {
  name: string
  documentType?: DocumentType | null
  documentNumber?: string | null
  legalName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  defaultPaymentTermDays?: number | null
  notes?: string | null
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const customersApi = {
  search: async (params: Record<string, string | number | boolean | string[] | undefined>): Promise<{
    content: CustomerListItemDto[]; page: number; size: number; totalElements: number
  }> => {
    const { data } = await client.get('/customers/search', { params, paramsSerializer: { indexes: null } })
    return data
  },

  summary: async (): Promise<CustomerSummaryDto> => {
    const { data } = await client.get('/customers/summary')
    return data
  },

  detail: async (id: string): Promise<CustomerDetailDto> => {
    const { data } = await client.get(`/customers/${id}`)
    return data
  },

  create: async (req: CustomerUpsertRequest): Promise<CustomerListItemDto> => {
    const { data } = await client.post('/customers/full', req)
    return data
  },

  update: async (id: string, req: CustomerUpsertRequest): Promise<CustomerListItemDto> => {
    const { data } = await client.put(`/customers/${id}`, req)
    return data
  },
}
