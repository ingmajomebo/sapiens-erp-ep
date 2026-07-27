import { useAuthStore } from '../store/useAuthStore'

export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.user?.permissions?.includes(code) ?? false)
}
