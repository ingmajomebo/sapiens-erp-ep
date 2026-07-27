import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
  /** Auto-activado cuando options.length > 8 */
  searchable?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  style,
  disabled = false,
  searchable,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  const autoSearch = searchable ?? options.length > 8
  const selected   = options.find(o => o.value === value)
  const filtered   = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // ── Posición del dropdown ─────────────────────────────────────────────────

  function calcPos() {
    if (!triggerRef.current) return
    const r   = triggerRef.current.getBoundingClientRect()
    const est = Math.min(filtered.length * 36 + (autoSearch ? 48 : 0) + 10, 280)
    const above = r.bottom + est > window.innerHeight - 8 && r.top > est
    setPos({ top: above ? r.top - est - 4 : r.bottom + 4, left: r.left, width: r.width, above })
  }

  // ── Abrir / cerrar ────────────────────────────────────────────────────────

  function openDrop() {
    if (disabled) return
    calcPos()
    setOpen(true)
    setQuery('')
  }

  function closeDrop() {
    setOpen(false)
    setQuery('')
  }

  function toggle() {
    open ? closeDrop() : openDrop()
  }

  function pick(val: string) {
    onChange(val)
    closeDrop()
    triggerRef.current?.focus()
  }

  // ── Click fuera ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) closeDrop()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // ── Re-posicionar al hacer scroll o resize ────────────────────────────────

  useEffect(() => {
    if (!open) return
    const h = () => calcPos()
    window.addEventListener('scroll', h, true)
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h) }
  }, [open, filtered.length])

  // ── Foco en búsqueda ─────────────────────────────────────────────────────

  useEffect(() => {
    if (open && autoSearch) setTimeout(() => searchRef.current?.focus(), 0)
  }, [open, autoSearch])

  // ── Teclado en el trigger ─────────────────────────────────────────────────

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      openDrop()
    }
    if (e.key === 'Escape') closeDrop()
  }

  // ── Teclado en el dropdown ────────────────────────────────────────────────

  function onDropKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { closeDrop(); triggerRef.current?.focus() }
    if (e.key === 'Tab') closeDrop()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', display: 'inline-block', boxSizing: 'border-box', ...style }}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '8px 10px 8px 11px',
          borderRadius: 8,
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          background: 'var(--bg)',
          color: selected ? 'var(--text)' : 'var(--muted)',
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: open
            ? '0 0 0 2.5px color-mix(in srgb, var(--accent) 22%, transparent)'
            : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>

      {/* Dropdown — en portal para evitar recorte por overflow */}
      {open && createPortal(
        <div
          ref={dropRef}
          role="listbox"
          onKeyDown={onDropKey}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            transformOrigin: pos.above ? 'bottom' : 'top',
            animation: 'selectDropIn 0.13s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Búsqueda */}
          {autoSearch && (
            <div style={{ padding: '8px 8px 4px' }}>
              <div style={{ position: 'relative' }}>
                <SearchIcon />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder="Buscar…"
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Opciones */}
          <div style={{ maxHeight: 232, overflowY: 'auto', padding: '4px 4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
                Sin resultados
              </div>
            ) : filtered.map(opt => {
              const isSelected = opt.value === value
              return (
                <OptionItem
                  key={opt.value}
                  opt={opt}
                  isSelected={isSelected}
                  onPick={pick}
                />
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden
      style={{
        flexShrink: 0,
        color: 'var(--muted)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
      <path d="M2.5 5L6.5 9L10.5 5" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden
      style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function OptionItem({ opt, isSelected, onPick }: { opt: SelectOption; isSelected: boolean; onPick: (v: string) => void }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onPick(opt.value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        borderRadius: 7,
        border: 'none',
        background: isSelected
          ? 'var(--accent-weak)'
          : hover
            ? 'var(--surface-2)'
            : 'transparent',
        color: isSelected ? 'var(--accent-text)' : 'var(--text)',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: isSelected ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
    >
      {/* Indicador de selección */}
      <span style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isSelected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {opt.label}
      </span>
      {opt.hint && (
        <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0, marginLeft: 4 }}>
          {opt.hint}
        </span>
      )}
    </button>
  )
}
