import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Page = 'dashboard' | 'inventory' | 'purchases' | 'sales' | 'cash' | 'accountsPayable' | 'accountsReceivable' | 'invoicing' | 'cashBanks' | 'expenses' | 'accounting' | 'project' | 'settings'
export type Lang = 'en' | 'es' | 'pt'
export type DrawerType = null | 'product' | 'po' | 'sale' | 'invoice' | 'expense' | 'closeRegister' | 'supplier'

export interface BrandColors {
  accent?: string
  sidebarBg?: string
  pos?: string
  neg?: string
  warn?: string
}

interface AppStore {
  page: Page
  theme: 'light' | 'dark'
  lang: Lang
  drawerType: DrawerType
  brandLogo: string | null
  companyName: string
  brandColors: BrandColors
  setPage: (p: Page) => void
  toggleTheme: () => void
  setLang: (l: Lang) => void
  openDrawer: (t: DrawerType) => void
  closeDrawer: () => void
  setBrandLogo: (url: string | null) => void
  setCompanyName: (name: string) => void
  setBrandColors: (colors: BrandColors) => void
  resetBrandColors: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      page: 'dashboard',
      theme: 'light',
      lang: 'en',
      drawerType: null,
      brandLogo: null,
      companyName: 'La Pescadería',
      brandColors: {},
      setPage: (p) => set({ page: p }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setLang: (l) => set({ lang: l }),
      openDrawer: (t) => set({ drawerType: t }),
      closeDrawer: () => set({ drawerType: null }),
      setBrandLogo: (url) => set({ brandLogo: url }),
      setCompanyName: (name) => set({ companyName: name }),
      setBrandColors: (colors) => set((s) => ({ brandColors: { ...s.brandColors, ...colors } })),
      resetBrandColors: () => set({ brandColors: {} }),
    }),
    {
      name: 'sapiens-erp-brand',
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        brandLogo: s.brandLogo,
        companyName: s.companyName,
        brandColors: s.brandColors,
      }),
    }
  )
)
