import { useEffect, useRef } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'dashed'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  success?: boolean
  disabled?: boolean
  /**
   * Destructive hold-to-confirm pattern.
   * Fills a clip-path overlay from left to right over `holdDuration` ms.
   * Calls `onConfirm` when the fill completes — `onClick` is suppressed.
   */
  requireHold?: boolean
  holdDuration?: number
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onConfirm?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
  className?: string
  title?: string
}

const SpinnerIcon = ({ light }: { light: boolean }) => (
  <svg className="btn-spinner" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="5.5" stroke={light ? 'rgba(255,255,255,0.35)' : 'var(--border)'} strokeWidth="2" />
    <path
      d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5"
      stroke={light ? '#fff' : 'var(--accent)'}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg
    className="btn-check"
    width="15" height="15" viewBox="0 0 16 16"
    fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="2.5 8.5 6.5 12.5 13.5 3.5" />
  </svg>
)

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  disabled = false,
  requireHold = false,
  holdDuration = 1600,
  onClick,
  onConfirm,
  children,
  type = 'button',
  style,
  className = '',
  title,
}: ButtonProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdingRef = useRef(false)
  const isDisabled = disabled || loading

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function startHold() {
    if (isDisabled || !requireHold || holdingRef.current) return
    holdingRef.current = true
    const overlay = overlayRef.current
    if (overlay) {
      overlay.style.transition = `clip-path ${holdDuration}ms linear`
      overlay.style.clipPath = 'inset(0 0% 0 0)'
    }
    timerRef.current = setTimeout(() => {
      holdingRef.current = false
      if (overlay) {
        overlay.style.transition = 'clip-path 200ms var(--ease-btn)'
        overlay.style.clipPath = 'inset(0 100% 0 0)'
      }
      onConfirm?.()
    }, holdDuration)
  }

  function cancelHold() {
    if (!holdingRef.current) return
    holdingRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    const overlay = overlayRef.current
    if (overlay) {
      // Fast snap-back: asymmetric exit per Emil's principle
      overlay.style.transition = 'clip-path 200ms var(--ease-btn)'
      overlay.style.clipPath = 'inset(0 100% 0 0)'
    }
  }

  const isLight = variant === 'primary' || variant === 'danger'
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      data-loading={loading ? 'true' : undefined}
      onClick={requireHold ? undefined : onClick}
      onMouseDown={requireHold ? startHold : undefined}
      onMouseUp={requireHold ? cancelHold : undefined}
      onMouseLeave={requireHold ? cancelHold : undefined}
      onTouchStart={requireHold ? startHold : undefined}
      onTouchEnd={requireHold ? cancelHold : undefined}
      onTouchCancel={requireHold ? cancelHold : undefined}
      style={style}
      title={title}
    >
      {requireHold && (
        <div
          ref={overlayRef}
          className="btn-hold-overlay"
          style={{ clipPath: 'inset(0 100% 0 0)' }}
        />
      )}

      {loading && <SpinnerIcon light={isLight} />}

      <span className="btn-label">
        {success ? <CheckIcon /> : children}
      </span>
    </button>
  )
}
