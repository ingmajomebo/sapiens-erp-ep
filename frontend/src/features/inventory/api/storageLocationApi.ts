import client from '../../../api/client'

export interface StorageLocationDto {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  active: boolean
  capacity: number | null
  capacityUnit: string | null
}

export interface CreateStorageLocationDto {
  name: string
  description?: string | null
  isDefault?: boolean
  capacity?: number | null
  capacityUnit?: string | null
}

export const storageLocationApi = {
  listAll: async (): Promise<StorageLocationDto[]> => {
    const { data } = await client.get('/storage-locations')
    return data
  },

  getDefault: async (): Promise<StorageLocationDto> => {
    const { data } = await client.get('/storage-locations/default')
    return data
  },

  create: async (req: CreateStorageLocationDto): Promise<StorageLocationDto> => {
    const { data } = await client.post('/storage-locations', req)
    return data
  },

  update: async (id: string, req: CreateStorageLocationDto): Promise<StorageLocationDto> => {
    const { data } = await client.put(`/storage-locations/${id}`, req)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/storage-locations/${id}`)
  },
}
