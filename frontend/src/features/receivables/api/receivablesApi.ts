import client from '../../../api/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ReceivableStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
export type ReceiptStatus = 'ACTIVE' | 'VOIDED'
export type ReceiptPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
export type AgingBucket = 'CURRENT' | 'D1_30' | 'D31_60' | 'D60_PLUS'

export interface ReceivableDto {
  id: string
  customerId: string
  customerName: string
  invoiceId: string
  invoiceNumber: string
  total: number
  paid: number
  pending: number
  dueDate: string
  status: ReceivableStatus
  agingBucket: AgingBucket
  daysOverdue: number
}

export interface AppliedReceiptDto {
  receiptId: string
  number: string
  appliedAmount: number
  receiptAmount: number
  paymentMethod: ReceiptPaymentMethod
  reference: string | null
  status: ReceiptStatus
  voidReason: string | null
  receiptDate: string
}

export interface ReceivableDetailDto {
  receivable: ReceivableDto
  payments: AppliedReceiptDto[]
}

export interface PaymentReceiptDto {
  id: string
  number: string
  customerId: string
  customerName: string
  amount: number
  paymentMethod: ReceiptPaymentMethod
  financialAccountId: string | null
  reference: string | null
  status: ReceiptStatus
  voidReason: string | null
  voidedAt: string | null
  voidedByEmail: string | null
  receiptDate: string
  applications: { accountsReceivableId: string; invoiceNumber: string; amount: number }[]
}

export interface AgingRowDto {
  customerId: string
  customerName: string
  current: number
  d1To30: number
  d31To60: number
  d60Plus: number
  total: number
}

export interface AgingReportDto {
  totalPending: number
  totalOverdue: number
  openCount: number
  totalsByBucket: Record<AgingBucket, number>
  rows: AgingRowDto[]
}

export interface PaymentReceiptRequest {
  customerId: string
  amount: number
  paymentMethod: ReceiptPaymentMethod
  financialAccountId: string
  reference?: string
  applications: { accountsReceivableId: string; amount: number }[]
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const receivablesApi = {
  list: async (params: Record<string, string | number | boolean | undefined>): Promise<{
    content: ReceivableDto[]; page: number; size: number; totalElements: number
  }> => {
    const { data } = await client.get('/accounts-receivable', { params })
    return data
  },

  detail: async (id: string): Promise<ReceivableDetailDto> => {
    const { data } = await client.get(`/accounts-receivable/${id}`)
    return data
  },

  payments: async (id: string): Promise<AppliedReceiptDto[]> => {
    const { data } = await client.get(`/accounts-receivable/${id}/payments`)
    return data
  },

  aging: async (): Promise<AgingReportDto> => {
    const { data } = await client.get('/accounts-receivable/aging')
    return data
  },

  createReceipt: async (req: PaymentReceiptRequest): Promise<PaymentReceiptDto> => {
    const { data } = await client.post('/payment-receipts', req)
    return data
  },

  receiptDetail: async (id: string): Promise<PaymentReceiptDto> => {
    const { data } = await client.get(`/payment-receipts/${id}`)
    return data
  },

  voidReceipt: async (id: string, reason: string): Promise<PaymentReceiptDto> => {
    const { data } = await client.post(`/payment-receipts/${id}/void`, { reason })
    return data
  },

  /** CxC abiertas de un cliente (para la distribución FIFO del modal de abono). */
  openByCustomer: async (customerId: string): Promise<ReceivableDto[]> => {
    const { data } = await client.get('/accounts-receivable', {
      params: { customerId, size: 100 },
    })
    return (data.content as ReceivableDto[]).filter(r => r.status === 'PENDING' || r.status === 'PARTIALLY_PAID')
  },
}
