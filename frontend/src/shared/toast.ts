import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  exiting: boolean
  loadingSince?: number
}

// Tiempo mínimo que el preload (spinner) permanece visible antes de resolverse
// al check verde, para que la acción se alcance a apreciar aunque el backend
// responda al instante.
const MIN_PRELOAD_MS = 2000

// Module-level singleton — call toast() from anywhere, no context needed
let _toasts: ToastItem[] = []
let _listeners: Array<(t: ToastItem[]) => void> = []

function notify() {
  _listeners.forEach((l) => l([..._toasts]))
}

function scheduleDismiss(id: number) {
  // Start exit animation ~200ms before actual removal
  setTimeout(() => {
    _toasts = _toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    notify()
  }, 2800)

  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    notify()
  }, 3000)
}

export function toast(arg: string | { message: string; type?: ToastType }, typeArg: ToastType = 'success') {
  const message = typeof arg === 'string' ? arg : arg.message
  const type = typeof arg === 'string' ? typeArg : (arg.type ?? 'success')
  const id = Date.now() + Math.random()

  _toasts = [..._toasts, { id, message, type, exiting: false }]
  notify()
  scheduleDismiss(id)
}

/**
 * Toast persistente con spinner (preload) mientras corre una acción.
 * Resolver con toastResolve(id, mensaje, 'success' | 'error') — el mismo
 * toast pasa del spinner al check verde (o a error) sin parpadear.
 */
export function toastLoading(message: string): number {
  const id = Date.now() + Math.random()
  _toasts = [..._toasts, { id, message, type: 'loading', exiting: false, loadingSince: Date.now() }]
  notify()
  return id
}

export function toastResolve(id: number, message: string, type: ToastType = 'success') {
  const current = _toasts.find((t) => t.id === id)
  if (!current) {
    toast(message, type)
    return
  }

  const apply = () => {
    _toasts = _toasts.map((t) => (t.id === id ? { ...t, message, type, loadingSince: undefined } : t))
    notify()
    scheduleDismiss(id)
  }

  // Mantener el spinner al menos MIN_PRELOAD_MS antes de mostrar el resultado.
  const elapsed = current.loadingSince ? Date.now() - current.loadingSince : MIN_PRELOAD_MS
  const remaining = MIN_PRELOAD_MS - elapsed
  if (remaining > 0) setTimeout(apply, remaining)
  else apply()
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>(_toasts)

  useEffect(() => {
    _listeners.push(setItems)
    return () => {
      _listeners = _listeners.filter((l) => l !== setItems)
    }
  }, [])

  return items
}
