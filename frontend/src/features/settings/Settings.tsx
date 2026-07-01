import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { BrandColors } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'
import { Card } from '../../shared/helpers'

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2 MB

interface ColorField {
  key: keyof BrandColors
  labelKey: keyof typeof translations.en
  defaultLight: string
  defaultDark: string
}

const COLOR_FIELDS: ColorField[] = [
  { key: 'accent',    labelKey: 'set_color_accent',  defaultLight: '#0e7490', defaultDark: '#22d3ee' },
  { key: 'pos',       labelKey: 'set_color_pos',     defaultLight: '#0a7c6b', defaultDark: '#2dd4bf' },
  { key: 'neg',       labelKey: 'set_color_neg',     defaultLight: '#c9303f', defaultDark: '#fb7185' },
  { key: 'warn',      labelKey: 'set_color_warn',    defaultLight: '#a85c00', defaultDark: '#f0aa55' },
  { key: 'sidebarBg', labelKey: 'set_color_sidebar', defaultLight: '#f0f6f8', defaultDark: '#050c17' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
      {children}
    </div>
  )
}

export function Settings() {
  const { lang, theme, brandLogo, companyName, brandColors, setBrandLogo, setCompanyName, setBrandColors, resetBrandColors } = useAppStore()
  const t = translations[lang]

  const [tab, setTab] = useState<'brand' | 'colors'>('brand')
  const [nameInput, setNameInput] = useState(companyName)
  const [saved, setSaved] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setNameInput(companyName) }, [companyName])

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('File exceeds 2 MB limit.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setBrandLogo(result)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleSaveBrand() {
    setCompanyName(nameInput.trim() || companyName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleColorChange(key: keyof BrandColors, value: string) {
    setBrandColors({ [key]: value })
  }

  function getColorValue(field: ColorField): string {
    return brandColors[field.key] ?? (theme === 'dark' ? field.defaultDark : field.defaultLight)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ padding: '24px 26px 48px', maxWidth: 720, animation: 'fadeUp 0.25s ease' }}>
      {/* Tab bar */}
      <div style={{
        display: 'inline-flex',
        gap: 2,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 3,
        marginBottom: 28,
      }}>
        <button style={tabStyle(tab === 'brand')}  onClick={() => setTab('brand')}>
          {t.set_brand_tab}
        </button>
        <button style={tabStyle(tab === 'colors')} onClick={() => setTab('colors')}>
          {t.set_colors_tab}
        </button>
      </div>

      {/* ── BRAND TAB ── */}
      {tab === 'brand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Logo upload */}
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_logo_label}</SectionTitle>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 14,
                  border: `2px dashed ${brandLogo ? 'var(--accent-line)' : 'var(--border)'}`,
                  background: brandLogo ? 'var(--accent-weak)' : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = brandLogo ? 'var(--accent-line)' : 'var(--border)')}
              >
                {brandLogo ? (
                  <img src={brandLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--faint)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>Upload</div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  {t.set_logo_hint}
                </div>
                {logoError && (
                  <div style={{ fontSize: 12, color: 'var(--neg)', marginBottom: 10 }}>{logoError}</div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--accent)',
                      background: 'var(--accent-weak)',
                      color: 'var(--accent-text)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {brandLogo ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  {brandLogo && (
                    <button
                      onClick={() => setBrandLogo(null)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--neg)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t.set_logo_clear}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Company name */}
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_company_name}</SectionTitle>
            <FieldLabel>{t.set_company_name}</FieldLabel>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="La Pescadería"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </Card>

          {/* Save button + feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSaveBrand}
              style={{
                padding: '9px 20px',
                borderRadius: 9,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {t.set_save_brand}
            </button>
            {saved && (
              <span style={{
                fontSize: 13,
                color: 'var(--pos)',
                fontWeight: 600,
                animation: 'fadeUp 0.2s ease',
              }}>
                ✓ {t.set_saved}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── COLORS TAB ── */}
      {tab === 'colors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card style={{ padding: '24px 26px' }}>
            <SectionTitle>{t.set_colors_title}</SectionTitle>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              {t.set_colors_hint}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {COLOR_FIELDS.map((field) => {
                const currentValue = getColorValue(field)
                const isCustom = !!brandColors[field.key]
                return (
                  <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Color swatch + picker */}
                    <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: currentValue,
                        border: '2px solid var(--border)',
                        boxShadow: `0 0 0 3px ${currentValue}22`,
                        transition: 'box-shadow 0.15s',
                      }} />
                      <input
                        type="color"
                        value={currentValue}
                        onChange={(e) => handleColorChange(field.key, e.target.value)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                        }}
                      />
                    </label>

                    {/* Label + value */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {t[field.labelKey]}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>
                        {currentValue}
                        {isCustom && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: 'var(--accent-text)',
                            background: 'var(--accent-weak)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}>
                            personalizado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reset individual color */}
                    {isCustom && (
                      <button
                        onClick={() => {
                          const copy = { ...brandColors }
                          delete copy[field.key]
                          useAppStore.setState({ brandColors: copy })
                        }}
                        title="Reset to default"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontFamily: 'inherit',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 8a6 6 0 1 0 1.5-3.9"/>
                          <path d="M2 3.5V8h4.5"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Reset all */}
          <div>
            <button
              onClick={resetBrandColors}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t.set_reset_colors}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
