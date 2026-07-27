import client from '../../../api/client'

export interface PermissionDto {
  id: string
  code: string
  description: string
  module: string
}

export interface RoleDto {
  id: string
  name: string
  description: string | null
  system: boolean
  permissionCodes: string[]
  userCount: number
}

export interface RoleRequest {
  name: string
  description: string
  permissionIds: string[]
}

export const rolesApi = {
  listRoles: async (): Promise<RoleDto[]> => {
    const { data } = await client.get('/roles')
    return data
  },

  getRole: async (id: string): Promise<RoleDto> => {
    const { data } = await client.get(`/roles/${id}`)
    return data
  },

  createRole: async (req: RoleRequest): Promise<RoleDto> => {
    const { data } = await client.post('/roles', req)
    return data
  },

  updateRole: async (id: string, req: RoleRequest): Promise<RoleDto> => {
    const { data } = await client.put(`/roles/${id}`, req)
    return data
  },

  deleteRole: async (id: string): Promise<void> => {
    await client.delete(`/roles/${id}`)
  },

  listPermissions: async (): Promise<PermissionDto[]> => {
    const { data } = await client.get('/roles/permissions')
    return data
  },
}
