import React from 'react'
import { Button } from './Button'
import type { ButtonProps } from './Button'
import { Select } from './Select'
export { Select }
export type { SelectOption, SelectProps } from './Select'

// Tile color map
const tileColors: Record<string, { bg: string; color: string }> = {
  teal: { bg: 'color-mix(in srgb, #0d9488 15%, transparent)', color: '#0d9488' },
  blue: { bg: 'color-mix(in srgb, #2563eb 15%, transparent)', color: '#2563eb' },
  orange: { bg: 'color-mix(in srgb, #ea580c 15%, transparent)', color: '#ea580c' },
  purple: { bg: 'color-mix(in srgb, #7c3aed 15%, transparent)', color: '#7c3aed' },
  red: { bg: 'color-mix(in srgb, #dc2626 15%, transparent)', color: '#dc2626' },
  green: { bg: 'color-mix(in srgb, #16a34a 15%, transparent)', color: '#16a34a' },
}

export function Tile({ initial, tile, size = 32 }: { initial: string; tile: string; size?: number }) {
  const colors = tileColors[tile] ?? tileColors.blue
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: colors.bg,
      color: colors.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.34,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// Status chip
type StatusVariant = 'pos' | 'warn' | 'neg' | 'muted'

function getStatusVariant(status: string): StatusVariant {
  const s = status.toLowerCase()
  if (['ok', 'confirmed', 'received', 'paid', 'delivered'].includes(s)) return 'pos'
  if (['pending', 'issued', 'ordered', 'low', 'partial'].includes(s)) return 'warn'
  if (['critical', 'overdue', 'expired', 'neg'].includes(s)) return 'neg'
  return 'muted'
}

const variantStyles: Record<StatusVariant, React.CSSProperties> = {
  pos: { background: 'var(--pos-bg)', color: 'var(--pos)' },
  warn: { background: 'var(--warn-bg)', color: 'var(--warn)' },
  neg: { background: 'var(--neg-bg)', color: 'var(--neg)' },
  muted: { background: 'var(--bg)', color: 'var(--muted)' },
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const variant = getStatusVariant(status)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 9px',
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 600,
      ...variantStyles[variant],
    }}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Card wrapper
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// Card header
export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 18px 12px',
      borderBottom: '1px solid var(--line)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      {action}
    </div>
  )
}

// KPI card
export function KpiCard({
  label, value, sub, trend, trendPositive,
}: {
  label: string
  value: string
  sub?: string
  trend?: string
  trendPositive?: boolean
}) {
  return (
    <Card style={{ padding: '18px 20px', animation: 'fadeUp 0.3s ease' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {(trend || sub) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {trend && (
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: trendPositive ? 'var(--pos)' : 'var(--neg)',
              background: trendPositive ? 'var(--pos-bg)' : 'var(--neg-bg)',
              padding: '1px 7px',
              borderRadius: 6,
            }}>
              {trend}
            </span>
          )}
          {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
        </div>
      )}
    </Card>
  )
}

// Pie de paginación para tablas con datos en el cliente (volúmenes bajos):
// muestra el conteo y navega por páginas. Usar junto con items.slice(page*size, ...).
export function PaginationFooter({ total, page, pageSize, onPage, unit = 'registros' }: {
  total: number
  page: number
  pageSize: number
  onPage: (page: number) => void
  unit?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        {total} {unit} · página {Math.min(page + 1, totalPages)} de {totalPages}
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        <GhostBtn disabled={page === 0} onClick={() => onPage(page - 1)}>← Anterior</GhostBtn>
        <GhostBtn disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Siguiente →</GhostBtn>
      </div>
    </div>
  )
}

// Ghost button — thin wrapper so existing call sites need no changes
export function GhostBtn({ onClick, children, style, disabled }: { onClick?: () => void; children: React.ReactNode; style?: React.CSSProperties; disabled?: boolean }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} style={style} disabled={disabled}>
      {children}
    </Button>
  )
}

// Primary button — thin wrapper so existing call sites need no changes
export function PrimaryBtn({ onClick, children, loading, success, disabled, style, type }: Pick<ButtonProps, 'onClick' | 'children' | 'loading' | 'success' | 'disabled' | 'style' | 'type'>) {
  return (
    <Button variant="primary" type={type} onClick={onClick} loading={loading} success={success} disabled={disabled} style={style}>
      {children}
    </Button>
  )
}

// Table styles
export const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}

export const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

export const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  borderBottom: '1px solid var(--line)',
  color: 'var(--text-2)',
  fontSize: 13,
}

// Filter select
export function FilterSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return <Select value={value} onChange={onChange} options={options} />
}

// Simple bar chart (CSS-only)
export function SimpleBarChart({ data, height = 160 }: {
  data: { label: string; value: number; value2?: number }[]
  height?: number
}) {
  const max = Math.max(...data.flatMap((d) => [d.value, d.value2 ?? 0]))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: height - 20 }}>
            <div style={{
              width: d.value2 !== undefined ? '45%' : '60%',
              height: `${(d.value / max) * 100}%`,
              background: 'var(--accent)',
              borderRadius: '3px 3px 0 0',
              minHeight: 2,
              opacity: 0.85,
            }} />
            {d.value2 !== undefined && (
              <div style={{
                width: '45%',
                height: `${(d.value2 / max) * 100}%`,
                background: 'var(--neg)',
                borderRadius: '3px 3px 0 0',
                minHeight: 2,
                opacity: 0.7,
              }} />
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// Donut-style category legend
export function CategoryLegend({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{Math.round((item.value / total) * 100)}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item.value / total) * 100}%`, background: item.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
