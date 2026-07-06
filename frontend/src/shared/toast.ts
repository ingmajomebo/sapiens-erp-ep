import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  exiting: boolean
}

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
  _toasts = [..._toasts, { id, message, type: 'loading', exiting: false }]
  notify()
  return id
}

export function toastResolve(id: number, message: string, type: ToastType = 'success') {
  if (!_toasts.some((t) => t.id === id)) {
    toast(message, type)
    return
  }
  _toasts = _toasts.map((t) => (t.id === id ? { ...t, message, type } : t))
  notify()
  scheduleDismiss(id)
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
