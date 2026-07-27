import client from '../../../api/client'

export interface WarehouseDto {
  id: string
  name: string
  capacity: number | null
  capacityUnit: string
  description: string | null
  active: boolean
  isDefault: boolean
  currentStock: number
}

export interface WarehouseRequest {
  name: string
  capacity?: number | null
  capacityUnit?: string
  description?: string
}

export const warehouseApi = {
  listAll: () => client.get<WarehouseDto[]>('/warehouses').then(r => r.data),
  create: (req: WarehouseRequest) => client.post<WarehouseDto>('/warehouses', req).then(r => r.data),
  update: (id: string, req: WarehouseRequest) => client.put<WarehouseDto>(`/warehouses/${id}`, req).then(r => r.data),
  delete: (id: string) => client.delete(`/warehouses/${id}`),
}
