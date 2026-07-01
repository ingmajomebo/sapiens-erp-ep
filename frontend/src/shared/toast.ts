import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

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

export function toast(arg: string | { message: string; type?: ToastType }, typeArg: ToastType = 'success') {
  const message = typeof arg === 'string' ? arg : arg.message
  const type = typeof arg === 'string' ? typeArg : (arg.type ?? 'success')
  const id = Date.now() + Math.random()

  _toasts = [..._toasts, { id, message, type, exiting: false }]
  notify()

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
