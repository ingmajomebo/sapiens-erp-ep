import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useAuthStore } from '../../store/useAuthStore'
import { translations } from '../../i18n/translations'
import { Button } from '../../shared/Button'
import { authApi } from './api/authApi'

const FishIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12C6.5 12 3 9 2 6c3 0 6 1 8 3"/>
    <path d="M6.5 12C6.5 12 3 15 2 18c3 0 6-1 8-3"/>
    <path d="M6.5 12h9"/>
    <path d="M15.5 12c2-2 5-3.5 6.5-3.5-1 2.5-1 5 0 7-1.5 0-4.5-1.5-6.5-3.5z"/>
    <circle cx="19" cy="10" r="0.5" fill="currentColor"/>
  </svg>
)

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

export function LoginPage() {
  const { theme, lang, companyName, brandLogo } = useAppStore()
  const login = useAuthStore((s) => s.login)
  const t = translations[lang]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(email.trim(), password)
      login(data.accessToken, data.refreshToken, {
        id: data.userId,
        name: data.name,
        role: data.role,
        permissions: data.permissions ?? [],
      })
    } catch {
      setError(t.login_invalid)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 9,
    border: `1px solid ${error ? 'var(--neg)' : 'var(--border)'}`,
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 140ms ease',
  }

  return (
    <div
      data-theme={theme}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: '24px 16px',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 380,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {brandLogo ? (
            <img src={brandLogo} alt={companyName}
              style={{ maxWidth: 240, maxHeight: 88, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }} />
          ) : (
            <>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <FishIcon />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                {companyName}
              </div>
            </>
          )}
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {t.login_subtitle}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {t.login_email}
              </label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="admin@sapiens.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {t.login_password}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--faint)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12.5,
                color: 'var(--neg)',
                background: 'var(--neg-bg)',
                border: '1px solid color-mix(in srgb, var(--neg) 25%, transparent)',
                borderRadius: 8,
                padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {t.login_btn}
            </Button>
          </form>
        </div>

        {/* Footer hint */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--faint)' }}>
          Sapiens ERP · v0.1.0
        </div>
      </div>
    </div>
  )
}
