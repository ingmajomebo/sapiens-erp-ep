import client from '../../../api/client'

export interface POLineDto {
  id: string
  productId: string
  productName: string
  unitOfMeasure: string
  quantity: number
  unitCost: number
  taxRate: number
  discount: number
  lineTotal: number
}

export interface PurchaseOrderDto {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  expectedDelivery: string | null
  warehouse: string | null
  paymentTerms: string | null
  notes: string | null
  discount: number
  paidAmount: number
  subtotal: number
  totalTax: number
  total: number
  pendingBalance: number
  lines: POLineDto[]
  createdAt: string
  updatedAt: string
}

export interface CreatePOLineDto {
  productId: string
  quantity: number
  unitCost: number
  taxRate?: number
  discount?: number
}

export interface CreatePODto {
  supplierId: string
  expectedDelivery: string | null
  warehouse: string | null
  paymentTerms: string | null
  notes: string | null
  lines: CreatePOLineDto[]
}

export interface ReceiveLineDto {
  lineId: string
  quantityReceived: number
}

export interface ReceiveDto {
  lines: ReceiveLineDto[]
  notes: string | null
}

export interface ReceiptLineDto {
  id: string
  productId: string
  productName: string
  unitOfMeasure: string
  quantityOrdered: number
  quantityReceived: number
  quantityPending: number
  unitCost: number
  taxRate: number
  discount: number
  lineTotal: number
}

export interface ReceiptDto {
  id: string
  purchaseOrderId: string
  orderNumber: string
  notes: string | null
  lines: ReceiptLineDto[]
  totalReceived: number
  createdAt: string
}

export const purchaseOrderApi = {
  listAll: async (): Promise<PurchaseOrderDto[]> => {
    const { data } = await client.get('/purchase-orders')
    return data
  },

  getById: async (id: string): Promise<PurchaseOrderDto> => {
    const { data } = await client.get(`/purchase-orders/${id}`)
    return data
  },

  getReceipt: async (id: string): Promise<ReceiptDto> => {
    const { data } = await client.get(`/purchase-orders/${id}/receipt`)
    return data
  },

  create: async (req: CreatePODto): Promise<PurchaseOrderDto> => {
    const { data } = await client.post('/purchase-orders', req)
    return data
  },

  confirm: async (id: string): Promise<PurchaseOrderDto> => {
    const { data } = await client.post(`/purchase-orders/${id}/confirm`)
    return data
  },

  receive: async (id: string, req: ReceiveDto): Promise<PurchaseOrderDto> => {
    const { data } = await client.post(`/purchase-orders/${id}/receive`, req)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/purchase-orders/${id}`)
  },
}
