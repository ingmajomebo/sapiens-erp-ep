import { useAppStore, type Page, type Lang } from '../store/useAppStore'
import { translations } from '../i18n/translations'

const titleKeys: Record<Page, keyof typeof translations.en> = {
  dashboard:           'pg_dashboard',
  inventory:           'pg_inventory',
  purchases:           'pg_purchases',
  sales:               'pg_sales',
  cash:                'pg_cash',
  accountsPayable:     'pg_accounts_payable',
  accountsReceivable:  'pg_accounts_receivable',
  cashBanks:           'pg_cash_banks',
  accounting:          'pg_accounting',
  expenses:            'pg_expenses',
  project:             'pg_project',
  settings:            'pg_settings',
}

const subtitleKeys: Record<Page, keyof typeof translations.en> = {
  dashboard:           'sub_dashboard',
  inventory:           'sub_inventory',
  purchases:           'sub_purchases',
  sales:               'sub_sales',
  cash:                'sub_cash',
  accountsPayable:     'sub_accounts_payable',
  accountsReceivable:  'sub_accounts_receivable',
  cashBanks:           'sub_cash_banks',
  accounting:          'sub_accounting',
  expenses:            'sub_expenses',
  project:             'sub_project',
  settings:            'sub_settings',
}

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="6.5" cy="6.5" r="4.5"/>
    <line x1="10" y1="10" x2="14" y2="14"/>
  </svg>
)

export function Topbar() {
  const { page, theme, lang, toggleTheme, setLang } = useAppStore()
  const t = translations[lang]

  const langs: Lang[] = ['en', 'es', 'pt']

  return (
    <header style={{
      height: 64,
      background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 26px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Title area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          {t[titleKeys[page]]}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
          {t[subtitleKeys[page]]}
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: 280,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        padding: '7px 12px',
        color: 'var(--faint)',
      }}>
        <SearchIcon />
        <input
          type="text"
          placeholder={t.search}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        />
        <kbd style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--faint)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '1px 5px',
          fontFamily: 'inherit',
        }}>⌘K</kbd>
      </div>

      {/* Lang switcher */}
      <div style={{
        display: 'flex',
        gap: 2,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 3,
      }}>
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="btn"
            style={{
              padding: '4px 9px',
              borderRadius: 6,
              border: 'none',
              background: lang === l ? 'var(--accent)' : 'transparent',
              color: lang === l ? '#fff' : 'var(--muted)',
              fontSize: 11.5,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title="Toggle theme"
        className="btn btn-ghost btn-icon btn-topbar"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-icon btn-topbar">
          <BellIcon />
        </button>
        <span style={{
          position: 'absolute',
          top: 7,
          right: 7,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--neg)',
          border: '1.5px solid var(--surface)',
        }} />
      </div>
    </header>
  )
}
