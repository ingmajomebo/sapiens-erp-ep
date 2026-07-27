import client from '../../api/client'

export interface CashKpisDto {
  sessionId: string
  sessionNumber: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  openedByName: string | null
  openingAmount: number
  expectedBalance: number
  totalSales: number
  totalApPayments: number
  totalExpenses: number
  totalManualIn: number
  totalManualOut: number
  movementCount: number
  pmCash: number
  pmCard: number
  pmTransfer: number
}

export interface CashSessionDto {
  id: string
  sessionNumber: string
  openedByName: string | null
  closedByName: string | null
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  countedBalance: number | null
  variance: number | null
  status: 'OPEN' | 'CLOSED'
  notes: string | null
}

export interface CashMovementDto {
  id: string
  movementType: string
  direction: 'IN' | 'OUT'
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'
  amount: number
  reference: string | null
  description: string | null
  createdAt: string
}

export interface CashMovementRequest {
  direction: 'IN' | 'OUT'
  amount: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'
  description: string
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const cashSessionApi = {
  getCurrent: (): Promise<CashKpisDto | null> =>
    client.get<CashKpisDto>('/cash-sessions/current').then(r => r.data).catch(err => {
      if (err?.response?.status === 204) return null
      throw err
    }),

  open: (req: { openingBalance?: number; notes?: string }): Promise<CashSessionDto> =>
    client.post<CashSessionDto>('/cash-sessions', req).then(r => r.data),

  close: (id: string, req: { countedBalance: number; notes?: string }): Promise<CashSessionDto> =>
    client.post<CashSessionDto>(`/cash-sessions/${id}/close`, req).then(r => r.data),

  createMovement: (id: string, req: CashMovementRequest): Promise<CashMovementDto> =>
    client.post<CashMovementDto>(`/cash-sessions/${id}/movements`, req).then(r => r.data),

  getMovements: (id: string, page = 0, size = 50): Promise<Page<CashMovementDto>> =>
    client.get<Page<CashMovementDto>>(`/cash-sessions/${id}/movements`, { params: { page, size } }).then(r => r.data),

  getHistory: (page = 0, size = 20): Promise<Page<CashSessionDto>> =>
    client.get<Page<CashSessionDto>>('/cash-sessions', { params: { page, size } }).then(r => r.data),
}
