import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import type { BrandColors } from './store/useAppStore'
import { Sidebar } from './shared/Sidebar'
import { Topbar } from './shared/Topbar'
import { Drawer } from './shared/Drawer'
import { Dashboard } from './features/dashboard/Dashboard'
import { Inventory } from './features/inventory/Inventory'
import { Transformations } from './features/inventory/Transformations'
import { Purchases } from './features/purchases/Purchases'
import { Sales } from './features/sales/Sales'
import { PublicOrderPage } from './features/sales/PublicOrderPage'
import { Invoicing } from './features/invoicing/Invoicing'
import { Customers } from './features/customers/Customers'
import { CashRegister } from './features/cash/CashRegister'
import { AccountsPayablePage } from './features/finance/AccountsPayablePage'
import { Receivables } from './features/receivables/Receivables'
import { CashBanks } from './features/finance/CashBanks'
import { Expenses } from './features/finance/Expenses'
import { Accounting } from './features/finance/Accounting'
import { ProjectPage } from './features/project/ProjectPage'
import { Settings } from './features/settings/Settings'
import { ToastContainer } from './shared/ToastContainer'
import { LoginPage } from './features/auth/LoginPage'

const COLOR_VAR_MAP: Record<keyof BrandColors, string> = {
  accent: '--accent',
  sidebarBg: '--sidebar',
  pos: '--pos',
  neg: '--neg',
  warn: '--warn',
}

function PageContent() {
  const { page } = useAppStore()

  switch (page) {
    case 'dashboard':   return <Dashboard />
    case 'inventory':   return <Inventory />
    case 'transformations': return <Transformations />
    case 'purchases':   return <Purchases />
    case 'sales':       return <Sales />
    case 'customers':   return <Customers />
    case 'cash':                return <CashRegister />
    case 'accountsPayable':     return <AccountsPayablePage />
    case 'accountsReceivable':  return <Receivables />
    case 'invoicing':           return <Invoicing />
    case 'cashBanks':           return <CashBanks />
    case 'expenses':            return <Expenses />
    case 'accounting':          return <Accounting />
    case 'project':             return <ProjectPage />
    case 'settings':            return <Settings />
    default:            return <Dashboard />
  }
}

function App() {
  const { theme, brandColors } = useAppStore()
  const { accessToken } = useAuthStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.style.background = 'var(--bg)'
  }, [theme])

  // Apply brand color overrides as inline CSS variables on the root element.
  // Inline styles have higher specificity than stylesheet rules, so they override
  // both :root and [data-theme="dark"] declarations.
  useEffect(() => {
    const root = document.documentElement
    Object.entries(COLOR_VAR_MAP).forEach(([key, cssVar]) => {
      const value = brandColors[key as keyof BrandColors]
      if (value) {
        root.style.setProperty(cssVar, value)
      } else {
        root.style.removeProperty(cssVar)
      }
    })
  }, [brandColors])

  // Canal público de pedidos: accesible sin autenticación en /pedido/{token}
  const publicOrderMatch = window.location.pathname.match(/^\/pedido\/([A-Za-z0-9-]+)$/)
  if (publicOrderMatch) {
    return (
      <div data-theme={theme}>
        <PublicOrderPage token={publicOrderMatch[1]} />
      </div>
    )
  }

  if (!accessToken) {
    return <LoginPage />
  }

  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        overflow: 'hidden',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <PageContent />
        </main>
      </div>

      <Drawer />
      <ToastContainer />
    </div>
  )
}

export default App
