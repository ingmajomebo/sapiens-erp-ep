import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// ── Helpers to read/write the auth store from localStorage ──────────────────
// We read directly from localStorage instead of importing the store to avoid
// circular dependency (store → client → store).

function getAuthState(): { accessToken: string | null; refreshToken: string | null } | null {
  const raw = localStorage.getItem('auth-storage')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { state: { accessToken: string | null; refreshToken: string | null } }
    return parsed.state
  } catch {
    return null
  }
}

function patchStoredTokens(accessToken: string, refreshToken: string) {
  const raw = localStorage.getItem('auth-storage')
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    parsed.state.accessToken = accessToken
    parsed.state.refreshToken = refreshToken
    localStorage.setItem('auth-storage', JSON.stringify(parsed))
  } catch {
    // ignore — next request will re-auth
  }
}

// ── Request interceptor: attach Bearer token ─────────────────────────────────

client.interceptors.request.use((config) => {
  const state = getAuthState()
  if (state?.accessToken) {
    config.headers.Authorization = `Bearer ${state.accessToken}`
  }
  return config
})

// ── Response interceptor: refresh token on 401 ──────────────────────────────

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as typeof err.config & { _retry?: boolean }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true

      const state = getAuthState()
      if (state?.refreshToken) {
        try {
          // Use a plain axios call to avoid intercepting the refresh request itself
          const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refreshToken: state.refreshToken,
          })
          patchStoredTokens(data.accessToken, data.refreshToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return client(original)
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      // No refresh token or refresh failed: clear session and reload to show login
      localStorage.removeItem('auth-storage')
      window.location.reload()
    }

    return Promise.reject(err)
  }
)

export default client
