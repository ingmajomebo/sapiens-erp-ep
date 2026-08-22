import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  presentationId: string
  productSlug: string
  productName: string
  presentationName: string
  /** Solo para mostrar. El total real lo calcula el servidor. */
  unitPrice: number
  imageUrl: string
  quantity: number
}

/** Topes para que un carrito absurdo no llegue al checkout. */
export const MAX_UNITS_PER_LINE = 20
export const MAX_LINES = 50

export const MAX_NOTE_LENGTH = 300

interface CartState {
  items: CartItem[]
  /** Nota o fecha de entrega preferida. Viaja en shipping.notes. */
  note: string
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (presentationId: string) => void
  setQuantity: (presentationId: string, quantity: number) => void
  setNote: (note: string) => void
  clear: () => void
}

function clampQuantity(value: number): number {
  return Math.max(1, Math.min(MAX_UNITS_PER_LINE, Math.round(value)))
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      note: '',

      addItem: (item, quantity = 1) =>
        set(state => {
          const existing = state.items.find(i => i.presentationId === item.presentationId)
          // Añadir una presentación ya presente suma cantidad, no duplica línea
          if (existing) {
            return {
              items: state.items.map(i =>
                i.presentationId === item.presentationId
                  ? { ...i, quantity: clampQuantity(i.quantity + quantity) }
                  : i,
              ),
            }
          }
          if (state.items.length >= MAX_LINES) return state
          return { items: [...state.items, { ...item, quantity: clampQuantity(quantity) }] }
        }),

      removeItem: presentationId =>
        set(state => ({ items: state.items.filter(i => i.presentationId !== presentationId) })),

      setQuantity: (presentationId, quantity) =>
        set(state => ({
          items: state.items.map(i =>
            i.presentationId === presentationId ? { ...i, quantity: clampQuantity(quantity) } : i,
          ),
        })),

      setNote: note => set({ note: note.slice(0, MAX_NOTE_LENGTH) }),

      clear: () => set({ items: [], note: '' }),
    }),
    { name: 'encanto-cart' },
  ),
)

/** Unidades totales, para el badge del header. */
export function useCartCount(): number {
  return useCartStore(state => state.items.reduce((sum, i) => sum + i.quantity, 0))
}

/** Subtotal indicativo; el definitivo lo devuelve el backend. */
export function useCartSubtotal(): number {
  return useCartStore(state => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
}
