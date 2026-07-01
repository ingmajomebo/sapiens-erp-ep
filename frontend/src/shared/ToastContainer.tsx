import { useToasts } from './toast'

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
          <span className="toast-dot" aria-hidden />
          {t.message}
        </div>
      ))}
    </div>
  )
}
