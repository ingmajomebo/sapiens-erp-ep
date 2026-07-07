import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type ExpenseDto, type ExpenseCategory, type ExpenseRequestDto } from './api/expensesApi'
import { cashBanksApi, type FinancialAccountDto } from './api/cashBanksApi'
import {
  Card, CardHeader, KpiCard, GhostBtn, PrimaryBtn,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'

// ── Constantes ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SUPPLIES:    'Insumos',
  UTILITIES:   'Servicios básicos',
  SALARIES:    'Sueldos',
  RENT:        'Alquiler',
  MAINTENANCE: 'Mantenimiento',
  TRANSPORT:   'Transporte',
  CLEANING:    'Limpieza',
  TAXES:       'Impuestos',
  INSURANCE:   'Seguros',
  PACKAGING:   'Embalaje',
  OTHER:       'Otros',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SUPPLIES:    '#6366f1',
  UTILITIES:   '#0ea5e9',
  SALARIES:    '#10b981',
  RENT:        '#f59e0b',
  MAINTENANCE: '#8b5cf6',
  TRANSPORT:   '#06b6d4',
  CLEANING:    '#84cc16',
  TAXES:       '#ef4444',
  INSURANCE:   '#ec4899',
  PACKAGING:   '#f97316',
  OTHER:       '#94a3b8',
}

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: 'Registrado',
  RECONCILED: 'Conciliado',
}

// ── Estilos locales ───────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
  width: '92vw', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
}
const modalBody: React.CSSProperties = { padding: '20px 24px', overflowY: 'auto', flex: 1 }
const modalFooter: React.CSSProperties = {
  padding: '12px 24px', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const,
}
const fieldLabel = (text: string) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>
    {text}
  </div>
)

// ── Modal de formulario ──────────────────────────────────────────────────────

function ExpenseModal({
  expense,
  accounts,
  onClose,
}: {
  expense: ExpenseDto | null
  accounts: FinancialAccountDto[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = expense !== null

  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'OTHER')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(expense?.description ?? '')
  const [accountId, setAccountId] = useState(expense?.financialAccountId ?? (accounts[0]?.id ?? ''))

  const saveMut = useMutation({
    mutationFn: (req: ExpenseRequestDto) =>
      isEdit ? expensesApi.update(expense!.id, req) : expensesApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast({ type: 'success', message: isEdit ? 'Gasto actualizado' : 'Gasto registrado' })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ type: 'error', message: msg ?? 'Error al guardar el gasto' })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      toast({ type: 'error', message: 'El monto debe ser mayor a 0' })
      return
    }
    if (!accountId) {
      toast({ type: 'error', message: 'Selecciona una cuenta financiera' })
      return
    }
    saveMut.mutate({ category, amount: parsed, expenseDate, description, financialAccountId: accountId })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{isEdit ? 'Editar gasto' : 'Registrar gasto'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {isEdit
                ? 'El ajuste de monto actualiza el saldo de la cuenta'
                : 'El monto se descontará de la cuenta seleccionada'}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div style={modalBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {fieldLabel('Categoría')}
                <select style={inputStyle} value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                  {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  {fieldLabel('Monto *')}
                  <input style={inputStyle} type="number" min="0.01" step="0.01"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" required />
                </div>
                <div>
                  {fieldLabel('Fecha *')}
                  <input style={inputStyle} type="date"
                    value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                    required />
                </div>
              </div>

              <div>
                {fieldLabel('Descripción *')}
                <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe el gasto..." required />
              </div>

              {!isEdit ? (
                <div>
                  {fieldLabel('Cuenta financiera *')}
                  <select style={inputStyle} value={accountId}
                    onChange={e => setAccountId(e.target.value)} required>
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} — Saldo: {formatCOP(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                  Cuenta: <strong style={{ color: 'var(--text)' }}>{expense.financialAccountName}</strong>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11.5 }}>
                    La cuenta no cambia al editar. Para cambiarla, elimina este gasto y créalo nuevamente.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={modalFooter}>
            <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
            <PrimaryBtn type="submit" loading={saveMut.isPending}>
              {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de confirmación de eliminación ─────────────────────────────────────

function DeleteModal({ expense, onClose }: { expense: ExpenseDto; onClose: () => void }) {
  const qc = useQueryClient()

  const deleteMut = useMutation({
    mutationFn: () => expensesApi.delete(expense.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toast({ type: 'success', message: 'Gasto eliminado y saldo revertido' })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ type: 'error', message: msg ?? 'Error al eliminar el gasto' })
    },
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={modalBody}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Eliminar gasto</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
            Se eliminará <strong style={{ color: 'var(--text)' }}>"{expense.description}"</strong> por{' '}
            <strong style={{ color: 'var(--text)' }}>{formatCOP(expense.amount)}</strong>.
            El monto será <strong>revertido</strong> en la cuenta{' '}
            <strong style={{ color: 'var(--text)' }}>{expense.financialAccountName}</strong>.
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--neg-bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--neg)' }}>
            Esta acción genera un movimiento de reversión. No puede deshacerse.
          </div>
        </div>
        <div style={modalFooter}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}
            style={{ background: 'var(--neg)' }}>
            Sí, eliminar
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

const NOW = new Date()
const CURRENT_YEAR = String(NOW.getFullYear())
const CURRENT_MONTH_NUM = String(NOW.getMonth() + 1).padStart(2, '0')

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Meses en español; 'all' = todo el año
const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todo el año' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: capitalize(new Date(2000, i, 1).toLocaleDateString('es-CO', { month: 'long' })),
  })),
]

const selectStyle: React.CSSProperties = {
  fontSize: 11.5, padding: '3px 6px', borderRadius: 6, colorScheme: 'light dark',
  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'inherit', cursor: 'pointer',
}

export function Expenses() {
  const [formModal, setFormModal] = useState<{ open: boolean; expense: ExpenseDto | null }>({ open: false, expense: null })
  const [deleteTarget, setDeleteTarget] = useState<ExpenseDto | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(CURRENT_YEAR)
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_MONTH_NUM)
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set())

  const toggleDesc = (id: string) => setExpandedDesc(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.listAll,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
  })

  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')

  const filtered = filterCategory
    ? expenses.filter(e => e.category === filterCategory)
    : expenses

  // Años disponibles según los datos, más el año actual, de más reciente a más antiguo
  const availableYears = Array.from(
    new Set([CURRENT_YEAR, ...expenses.map(e => e.expenseDate.slice(0, 4))])
  ).sort((a, b) => b.localeCompare(a))

  // Filtro por año completo o por un mes específico de ese año
  const periodPrefix = selectedMonth === 'all' ? selectedYear : `${selectedYear}-${selectedMonth}`
  const periodExpenses = expenses.filter(e => e.expenseDate.startsWith(periodPrefix))
  const totalPeriod = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const periodLabel = selectedMonth === 'all'
    ? `del año ${selectedYear}`
    : `de ${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label ?? ''} de ${selectedYear}`
  const isCurrentPeriod = selectedYear === CURRENT_YEAR && selectedMonth === CURRENT_MONTH_NUM

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[])
    .map(c => ({ category: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Gastos operativos</h2>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Control de egresos del negocio con trazabilidad de cuenta
          </div>
        </div>
        <PrimaryBtn onClick={() => setFormModal({ open: true, expense: null })}>
          + Registrar gasto
        </PrimaryBtn>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {/* Gasto del período con selectores de mes y año */}
        <Card style={{ padding: '18px 20px', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
              Gasto {periodLabel}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                aria-label="Elegir mes" style={selectStyle}>
                {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                aria-label="Elegir año" style={selectStyle}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
            {formatCOP(totalPeriod)}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {periodExpenses.length} {periodExpenses.length === 1 ? 'gasto' : 'gastos'}
              {selectedMonth === 'all' ? ' en el año' : ''}
            </span>
            {!isCurrentPeriod && (
              <button onClick={() => { setSelectedYear(CURRENT_YEAR); setSelectedMonth(CURRENT_MONTH_NUM) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                Volver al mes actual
              </button>
            )}
          </div>
        </Card>
        <KpiCard label="Gasto total" value={formatCOP(totalAll)} color="orange" />
        <KpiCard label="Registros activos" value={String(expenses.length)} color="blue" />
      </div>

      {/* Filtro por categoría */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader title="Por categoría" />
          <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {byCategory.map(x => (
              <button key={x.category} type="button"
                onClick={() => setFilterCategory(filterCategory === x.category ? '' : x.category)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 20,
                  border: `1.5px solid ${filterCategory === x.category ? CATEGORY_COLORS[x.category] : 'transparent'}`,
                  background: `${CATEGORY_COLORS[x.category]}18`,
                  color: CATEGORY_COLORS[x.category],
                  cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  transition: 'border 0.15s',
                }}>
                <span>{CATEGORY_LABELS[x.category]}</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{formatCOP(x.total)}</span>
              </button>
            ))}
            {filterCategory && (
              <button type="button" onClick={() => setFilterCategory('')}
                style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                × Quitar filtro
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader
          title={filterCategory
            ? `${CATEGORY_LABELS[filterCategory as ExpenseCategory]} (${filtered.length})`
            : `Todos los gastos (${filtered.length})`}
        />
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                {filterCategory ? 'Sin gastos en esta categoría' : 'Aún no hay gastos registrados'}
              </div>
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Cuenta</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {new Date(e.expenseDate + 'T00:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 9px', borderRadius: 20,
                        background: `${CATEGORY_COLORS[e.category]}18`,
                        color: CATEGORY_COLORS[e.category],
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {CATEGORY_LABELS[e.category]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      {e.description ? (
                        <div
                          onClick={() => toggleDesc(e.id)}
                          title={expandedDesc.has(e.id) ? 'Clic para contraer' : e.description}
                          style={{
                            cursor: 'pointer',
                            ...(expandedDesc.has(e.id)
                              ? { whiteSpace: 'normal', wordBreak: 'break-word' }
                              : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
                          }}
                        >
                          {e.description}
                        </div>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12.5 }}>
                      {e.financialAccountName}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--neg)', whiteSpace: 'nowrap' }}>
                      -{formatCOP(e.amount)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: e.status === 'RECONCILED' ? '#d1fae5' : '#f1f5f9',
                        color: e.status === 'RECONCILED' ? '#059669' : '#64748b',
                      }}>
                        {STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {e.status !== 'RECONCILED' && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <GhostBtn onClick={() => setFormModal({ open: true, expense: e })}>
                            Editar
                          </GhostBtn>
                          <GhostBtn style={{ color: 'var(--neg)' }} onClick={() => setDeleteTarget(e)}>
                            Eliminar
                          </GhostBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {formModal.open && (
        <ExpenseModal
          expense={formModal.expense}
          accounts={activeAccounts}
          onClose={() => setFormModal({ open: false, expense: null })}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
