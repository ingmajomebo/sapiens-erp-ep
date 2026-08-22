import client from '../../../api/client'

export interface AccountsPayableDto {
  id: string
  purchaseOrderId: string
  orderNumber: string
  supplierId: string
  supplierName: string
  invoiceNumber: string | null
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
  dueDate: string | null
  notes: string | null
  createdAt: string
}

export interface SupplierPaymentDto {
  id: string
  paymentDate: string
  amount: number
  paymentMethod: string | null
  paymentOrigin: string | null
  supplierAccount: string | null
  referenceNumber: string | null
  notes: string | null
  createdAt: string
}

export interface PaymentRequestDto {
  amount: number
  paymentDate?: string | null
  paymentMethod?: string | null
  paymentOrigin?: string | null
  supplierAccount?: string | null
  referenceNumber?: string | null
  notes?: string | null
  financialAccountId?: string | null
}

export const accountsPayableApi = {
  listAll: async (): Promise<AccountsPayableDto[]> => {
    const { data } = await client.get('/accounts-payable')
    return data
  },

  listPending: async (): Promise<AccountsPayableDto[]> => {
    const { data } = await client.get('/accounts-payable/pending')
    return data
  },

  getByPurchaseOrder: async (poId: string): Promise<AccountsPayableDto> => {
    const { data } = await client.get(`/accounts-payable/by-purchase-order/${poId}`)
    return data
  },

  getPayments: async (apId: string): Promise<SupplierPaymentDto[]> => {
    const { data } = await client.get(`/accounts-payable/${apId}/payments`)
    return data
  },

  pay: async (id: string, req: PaymentRequestDto): Promise<AccountsPayableDto> => {
    const { data } = await client.post(`/accounts-payable/${id}/pay`, req)
    return data
  },
}
