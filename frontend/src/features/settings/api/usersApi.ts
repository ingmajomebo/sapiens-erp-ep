import client from '../../../api/client'

export interface UserDto {
  id: string
  name: string
  email: string
  roleId: string
  roleName: string
  enabled: boolean
  lastLogin: string | null
  createdAt: string
}

export interface CreateUserDto {
  name: string
  email: string
  password: string
  roleId: string
}

export interface UpdateUserDto {
  name: string
  email: string
  roleId: string
  enabled: boolean
}

export const usersApi = {
  listAll: async (): Promise<UserDto[]> => {
    const { data } = await client.get('/users')
    return data
  },

  create: async (req: CreateUserDto): Promise<UserDto> => {
    const { data } = await client.post('/users', req)
    return data
  },

  update: async (id: string, req: UpdateUserDto): Promise<UserDto> => {
    const { data } = await client.put(`/users/${id}`, req)
    return data
  },

  /** Solo el administrador la cambia; el usuario no elige la suya aquí. */
  resetPassword: async (id: string, password: string): Promise<void> => {
    await client.put(`/users/${id}/password`, { password })
  },

  deactivate: async (id: string): Promise<void> => {
    await client.delete(`/users/${id}`)
  },
}
