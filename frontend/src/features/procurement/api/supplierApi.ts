import client from '../../../api/client'

export interface SupplierDto {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  active: boolean
  createdAt: string
}

export interface CreateSupplierDto {
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  taxId: string
  notes?: string | null
}

export const supplierApi = {
  listAll: async (): Promise<SupplierDto[]> => {
    const { data } = await client.get('/suppliers')
    return data
  },

  create: async (req: CreateSupplierDto): Promise<SupplierDto> => {
    const { data } = await client.post('/suppliers', req)
    return data
  },

  update: async (id: string, req: CreateSupplierDto): Promise<SupplierDto> => {
    const { data } = await client.put(`/suppliers/${id}`, req)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/suppliers/${id}`)
  },
}
