import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  role: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'auth-storage',          // matches what client.ts already reads
      partialize: (s) => ({
        accessToken:  s.accessToken,
        refreshToken: s.refreshToken,
        user:         s.user,
      }),
    }
  )
)
