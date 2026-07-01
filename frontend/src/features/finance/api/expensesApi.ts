import client from '../../../api/client'

export type ExpenseCategory =
  | 'SUPPLIES' | 'UTILITIES' | 'SALARIES' | 'RENT' | 'MAINTENANCE'
  | 'TRANSPORT' | 'CLEANING' | 'TAXES' | 'INSURANCE' | 'PACKAGING' | 'OTHER'

export type ExpenseStatus = 'REGISTERED' | 'RECONCILED'

export interface ExpenseDto {
  id: string
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string
  status: ExpenseStatus
  financialAccountId: string
  financialAccountName: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseRequestDto {
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description: string
  financialAccountId: string
}

export const expensesApi = {
  listAll: async (): Promise<ExpenseDto[]> => {
    const { data } = await client.get('/expenses')
    return data
  },
  create: async (req: ExpenseRequestDto): Promise<ExpenseDto> => {
    const { data } = await client.post('/expenses', req)
    return data
  },
  update: async (id: string, req: ExpenseRequestDto): Promise<ExpenseDto> => {
    const { data } = await client.put(`/expenses/${id}`, req)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await client.delete(`/expenses/${id}`)
  },
}
