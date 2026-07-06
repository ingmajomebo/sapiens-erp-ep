import { useToasts } from './toast'
import type { ToastType } from './toast'

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'loading') return <span className="toast-spinner" aria-hidden />
  if (type === 'success') {
    return (
      <span className="toast-check" aria-hidden>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5.5L4 8L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (type === 'error') {
    return (
      <span className="toast-cross" aria-hidden>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  return <span className="toast-dot" aria-hidden />
}

export function ToastContainer() {
  const toasts = useToasts()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={['toast', `toast-${t.type}`, t.exiting ? 'toast-out' : ''].filter(Boolean).join(' ')}
          role="status"
        >
          <ToastIcon type={t.type} />
          {t.message}
        </div>
      ))}
    </div>
  )
}
