import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Uses a plain axios instance (not the auth client) to avoid circular interception on login/refresh
const authAxios = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: string
  name: string
  role: string
  permissions: string[]
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await authAxios.post<LoginResponse>('/auth/login', { email, password })
    return data
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const { data } = await authAxios.post<LoginResponse>('/auth/refresh', { refreshToken })
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await authAxios.post('/auth/logout', { refreshToken })
  },
}
