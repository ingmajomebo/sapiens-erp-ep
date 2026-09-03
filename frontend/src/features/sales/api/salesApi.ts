import client from '../../../api/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SalesOrderStatus = 'PENDING' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
export type SalesChannel = 'PUBLIC' | 'ADMIN'
export type DeliveryMethod = 'PICKUP' | 'DELIVERY'
export type SalesInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
export type PaymentForm = 'CASH' | 'CREDIT'
export type InvoicePaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER'

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
  deliveryMethod: DeliveryMethod
  deliveryAddress: string | null
  cancelReason: string | null
  createdBy: string | null
  notes: string | null
  total: number
  lines: SalesOrderLineDto[]
  invoiceId: string | null
  invoiceNumber: string | null
  invoiceStatus: SalesInvoiceStatus | null
  createdAt: string
}

export interface SalesInvoiceDto {
  id: string
  invoiceNumber: string
  orderId: string
  orderNumber: string
  customerId: string | null
  customerName: string
  status: SalesInvoiceStatus
  overdue: boolean
  paymentForm: PaymentForm
  total: number
  paidAmount: number
  balance: number
  issuedAt: string | null
  dueDate: string | null
  paidAt: string | null
  cancelReason: string | null
  createdAt: string
}

export interface InvoiceLineDto {
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxRate: number
  taxAmount: number
  lineTotal: number
}

export interface InvoicePaymentDto {
  id: string
  amount: number
  paymentMethod: InvoicePaymentMethod
  paidOn: string
  reference: string | null
  notes: string | null
}

export interface InvoiceHistoryDto {
  fromStatus: SalesInvoiceStatus | null
  toStatus: SalesInvoiceStatus
  reason: string | null
  changedBy: string | null
  changedAt: string
}

export interface CreditNoteDto {
  id: string
  noteNumber: string
  invoiceNumber: string
  reason: string
  total: number
  issuedAt: string
}

export interface InvoiceDetailDto {
  header: SalesInvoiceDto
  subtotal: number
  totalDiscounts: number
  totalTaxes: number
  taxesByRate: Record<string, number>
  creditTermDays: number
  paymentMethod: InvoicePaymentMethod | null
  notes: string | null
  customerEmail: string | null
  customerPhone: string | null
  lines: InvoiceLineDto[]
  payments: InvoicePaymentDto[]
  history: InvoiceHistoryDto[]
  creditNotes: CreditNoteDto[]
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
  deliveryMethod?: DeliveryMethod
  deliveryAddress?: string
  lines: { productId: string; quantity: number }[]
}

export interface PublicProductDto {
  id: string
  name: string
  unitOfMeasure: string
  salePrice: number
  imageUrl: string | null
}

/** Textos editables de la página pública, indexados por clave. */
export type StorefrontSettings = Record<string, string>

export interface PublicCatalogDto {
  label: string | null
  products: PublicProductDto[]
  storefront: StorefrontSettings
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

  cancel: async (id: string, reason: string): Promise<SalesOrderDto> => {
    const { data } = await client.patch(`/sales-orders/${id}/cancel`, { reason })
    return data
  },

  issueInvoice: async (id: string): Promise<SalesInvoiceDto> => {
    const { data } = await client.post(`/sales-orders/${id}/invoice`)
    return data
  },
}

export const salesInvoiceApi = {
  list: async (status?: string): Promise<SalesInvoiceDto[]> => {
    const { data } = await client.get('/sales-invoices', { params: status ? { status } : {} })
    return data
  },

  search: async (params: Record<string, string | number | boolean | string[] | undefined>): Promise<{ content: SalesInvoiceDto[]; page: number; size: number; totalElements: number }> => {
    const { data } = await client.get('/sales-invoices/search', { params, paramsSerializer: { indexes: null } })
    return data
  },

  summary: async (params: Record<string, string | number | boolean | string[] | undefined>): Promise<{
    drafts: number; issued: number; partiallyPaid: number; paid: number; cancelled: number
    overdue: number; pendingBalance: number; overdueBalance: number; paidTotal: number; total: number
  }> => {
    const { data } = await client.get('/sales-invoices/summary', { params, paramsSerializer: { indexes: null } })
    return data
  },

  detail: async (id: string): Promise<InvoiceDetailDto> => {
    const { data } = await client.get(`/sales-invoices/${id}`)
    return data
  },

  emit: async (id: string, req: { paymentForm: PaymentForm; creditTermDays?: number; paymentMethod?: InvoicePaymentMethod }): Promise<SalesInvoiceDto> => {
    const { data } = await client.patch(`/sales-invoices/${id}/emit`, req)
    return data
  },

  registerPayment: async (id: string, req: {
    amount: number
    paymentMethod: InvoicePaymentMethod
    /*
     * Cuenta que recibe el dinero. El backend la acepta desde siempre pero
     * este tipo no la declaraba, así que la interfaz nunca la enviaba: los
     * recibos nacían sin cuenta y el saldo de las cajas no se movía.
     */
    financialAccountId?: string
    paidOn?: string
    reference?: string
    notes?: string
  }): Promise<SalesInvoiceDto> => {
    const { data } = await client.post(`/sales-invoices/${id}/payments`, req)
    return data
  },

  pay: async (id: string): Promise<SalesInvoiceDto> => {
    const { data } = await client.patch(`/sales-invoices/${id}/pay`)
    return data
  },

  cancel: async (id: string, reason: string): Promise<SalesInvoiceDto> => {
    const { data } = await client.patch(`/sales-invoices/${id}/cancel`, { reason })
    return data
  },

  downloadPdf: async (id: string, fileName: string): Promise<void> => {
    const { data } = await client.get(`/sales-invoices/${id}/pdf`, { responseType: 'blob' })
    triggerDownload(data, fileName)
  },

  downloadCreditNotePdf: async (noteId: string, fileName: string): Promise<void> => {
    const { data } = await client.get(`/credit-notes/${noteId}/pdf`, { responseType: 'blob' })
    triggerDownload(data, fileName)
  },
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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

export const storefrontApi = {
  getAll: async (): Promise<StorefrontSettings> => {
    const { data } = await client.get('/storefront-settings')
    return data
  },

  /** Envía solo las claves modificadas; el resto conserva su valor. */
  update: async (changes: StorefrontSettings): Promise<StorefrontSettings> => {
    const { data } = await client.put('/storefront-settings', changes)
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
