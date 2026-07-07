import { useQuery } from '@tanstack/react-query'
import { useAppStore, type Page } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { inventoryApi } from '../features/inventory/api/inventoryApi'

type NavItem = {
  key: Page
  icon: React.ReactNode
  label: string
  badge?: string
}

type NavDef = {
  key: Page
  icon: React.ReactNode
  badge?: string
}

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
  </svg>
)

const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L14.5 5v6L8 14.5 1.5 11V5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 1.5v13M1.5 5l6.5 3.5L14.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)

const ShoppingCartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 1.5h2l1.5 7.5h7l1.5-5H4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6.5" cy="12.5" r="1" fill="currentColor"/>
    <circle cx="11.5" cy="12.5" r="1" fill="currentColor"/>
  </svg>
)

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="5" cy="5" r="1" fill="currentColor"/>
  </svg>
)

const CashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 4V3.5A1.5 1.5 0 016 2h4a1.5 1.5 0 011.5 1.5V4" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M9.5 1.5v4H13.5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 11.5l4-4 3 3 5.5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 4.5H14.5V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ReceiptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 1.5v13l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V1.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5.5 5.5h5M5.5 8h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const ProjectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 6h13" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 9.5h6M5 11.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="4" cy="4.25" r="0.8" fill="currentColor"/>
    <circle cx="6.5" cy="4.25" r="0.8" fill="currentColor"/>
    <circle cx="9" cy="4.25" r="0.8" fill="currentColor"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M11 7.5a2.5 2.5 0 100-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12.5 9.8c1.3.5 2 1.6 2 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const navGroups: { labelKey: keyof typeof translations.en; items: NavDef[] }[] = [
  {
    labelKey: 'nav_general',
    items: [
      { key: 'dashboard', icon: <LayoutIcon /> },
    ],
  },
  {
    labelKey: 'nav_operations',
    items: [
      { key: 'inventory', icon: <BoxIcon /> },
      { key: 'purchases', icon: <ShoppingCartIcon /> },
      { key: 'sales', icon: <TagIcon /> },
      { key: 'customers', icon: <UsersIcon /> },
      { key: 'cash', icon: <CashIcon /> },
    ],
  },
  {
    labelKey: 'nav_finance',
    items: [
      { key: 'accountsPayable',    icon: <FileTextIcon /> },
      { key: 'accountsReceivable', icon: <ReceiptIcon /> },
      { key: 'invoicing',          icon: <ReceiptIcon /> },
      { key: 'cashBanks',          icon: <CashIcon /> },
      { key: 'expenses',           icon: <TagIcon /> },
      { key: 'accounting',         icon: <TrendingUpIcon /> },
    ],
  },
  {
    labelKey: 'nav_project_group',
    items: [
      { key: 'project', icon: <ProjectIcon /> },
    ],
  },
]

const navLabelKeys: Record<Page, keyof typeof translations.en> = {
  dashboard:           'nav_dashboard',
  inventory:           'nav_inventory',
  purchases:           'nav_purchases',
  sales:               'nav_sales',
  customers:           'nav_customers',
  cash:                'nav_cash',
  accountsPayable:     'nav_accounts_payable',
  accountsReceivable:  'nav_accounts_receivable',
  invoicing:           'nav_invoicing',
  cashBanks:           'nav_cash_banks',
  accounting:          'nav_accounting',
  expenses:            'nav_expenses',
  project:             'nav_project',
  settings:            'nav_settings',
}

function NavButton({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        border: 'none',
        background: isActive ? 'var(--accent-weak)' : 'transparent',
        color: isActive ? 'var(--accent-text)' : 'var(--sidebar-text)',
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s, color 0.12s',
        fontFamily: 'inherit',
        marginBottom: 1,
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-weak)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span style={{
          background: 'var(--neg)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 10,
          padding: '1px 6px',
          lineHeight: '16px',
        }}>{item.badge}</span>
      )}
    </button>
  )
}

export function Sidebar() {
  const { page, setPage, lang, brandLogo, companyName } = useAppStore()
  const t = translations[lang]

  // Alertas reales de inventario: productos en nivel bajo, crítico o agotados
  const { data: stockPage } = useQuery({
    queryKey: ['inventory-stock', 'alerts'],
    queryFn: () => inventoryApi.listStock(0, 500),
  })
  const inventoryAlerts = (stockPage?.content ?? [])
    .filter(s => s.stockStatus === 'LOW' || s.stockStatus === 'CRITICAL' || s.stockStatus === 'OUT_OF_STOCK')
    .length
  const badgeFor = (key: Page): string | undefined =>
    key === 'inventory' && inventoryAlerts > 0 ? String(inventoryAlerts) : undefined

  return (
    <aside style={{
      width: 248,
      minWidth: 248,
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo area */}
      <div style={{
        padding: '20px 18px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
      }}>
        {brandLogo ? (
          // Logo con marca propia (típicamente un logotipo horizontal con el nombre):
          // se muestra tal cual, ajustado al ancho, sin recortar en una caja pequeña.
          <div>
            <img
              src={brandLogo}
              alt={companyName}
              style={{ maxWidth: '100%', maxHeight: 52, objectFit: 'contain', display: 'block' }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{t.tenant_plan}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12C5 5 19 5 22 12C19 19 5 19 2 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <ellipse cx="12" cy="12" rx="4" ry="3" fill="white" opacity="0.9"/>
                <circle cx="12" cy="12" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{companyName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{t.tenant_plan}</div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
        {navGroups.map((group) => (
          <div key={group.labelKey} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
              padding: '0 8px 6px',
            }}>
              {t[group.labelKey]}
            </div>
            {group.items.map((item: NavDef) => (
              <NavButton
                key={item.key}
                item={{ ...item, label: t[navLabelKeys[item.key]] as string, badge: badgeFor(item.key) }}
                isActive={page === item.key}
                onClick={() => setPage(item.key)}
              />
            ))}
          </div>
        ))}

        {/* Settings link at bottom of nav */}
        <div style={{ borderTop: '1px solid var(--sidebar-border)', paddingTop: 10, marginTop: 4 }}>
          <NavButton
            item={{ key: 'settings', icon: <GearIcon />, label: t.nav_settings }}
            isActive={page === 'settings'}
            onClick={() => setPage('settings')}
          />
        </div>
      </nav>

      {/* User area */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--pos), var(--accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
        }}>
          MG
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            María González
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.role_manager}</div>
        </div>
      </div>
    </aside>
  )
}
