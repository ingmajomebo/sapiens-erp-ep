import client from '../../../api/client'

export type FinancialAccountType = 'CASH' | 'BANK' | 'DIGITAL_WALLET'
export type FinancialAccountStatus = 'ACTIVE' | 'INACTIVE'

export interface FinancialAccountDto {
  id: string
  name: string
  accountType: FinancialAccountType
  initialBalance: number
  currentBalance: number
  status: FinancialAccountStatus
  notes: string | null
  createdAt: string
}

export interface FinancialMovementDto {
  id: string
  movementType: 'INCOME' | 'EXPENSE'
  concept: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  relatedDocument: string | null
  movementDate: string
  createdAt: string
}

export interface FinancialAccountRequestDto {
  name: string
  accountType: FinancialAccountType
  initialBalance?: number
  notes?: string
}

export const cashBanksApi = {
  listAll: async (): Promise<FinancialAccountDto[]> => {
    const { data } = await client.get('/financial-accounts')
    return data
  },

  create: async (req: FinancialAccountRequestDto): Promise<FinancialAccountDto> => {
    const { data } = await client.post('/financial-accounts', req)
    return data
  },

  getMovements: async (id: string): Promise<FinancialMovementDto[]> => {
    const { data } = await client.get(`/financial-accounts/${id}/movements`)
    return data
  },
}
