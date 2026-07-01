import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cashBanksApi,
  type FinancialAccountDto,
  type FinancialMovementDto,
  type FinancialAccountType,
} from './api/cashBanksApi'
import {
  Card, CardHeader, KpiCard, GhostBtn, PrimaryBtn,
  tableStyle, thStyle, tdStyle,
} from '../../shared/helpers'
import { formatCOP } from '../../shared/currency'
import { toast } from '../../shared/toast'

// ── Types ────────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: { value: FinancialAccountType; label: string }[] = [
  { value: 'CASH',           label: 'Caja' },
  { value: 'BANK',           label: 'Banco' },
  { value: 'DIGITAL_WALLET', label: 'Billetera digital' },
]

const TYPE_LABEL: Record<FinancialAccountType, string> = {
  CASH:           'Caja',
  BANK:           'Banco',
  DIGITAL_WALLET: 'Billetera digital',
}

const TYPE_COLOR: Record<FinancialAccountType, { bg: string; color: string }> = {
  CASH:           { bg: 'color-mix(in srgb, var(--pos) 15%, transparent)',    color: 'var(--pos)' },
  BANK:           { bg: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' },
  DIGITAL_WALLET: { bg: 'color-mix(in srgb, var(--warn) 15%, transparent)',   color: 'var(--warn)' },
}

// ── Styles ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
  width: '92vw', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
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

// ── New account modal ─────────────────────────────────────────────────────────

function NewAccountModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName]               = useState('')
  const [type, setType]               = useState<FinancialAccountType>('CASH')
  const [initialBalance, setInitial]  = useState('')
  const [notes, setNotes]             = useState('')

  const mutation = useMutation({
    mutationFn: () => cashBanksApi.create({
      name: name.trim(),
      accountType: type,
      initialBalance: initialBalance ? parseFloat(initialBalance) : 0,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-accounts'] })
      toast('Cuenta creada correctamente', 'success')
      onClose()
    },
    onError: (err: Error) => toast(err.message ?? 'Error al crear la cuenta', 'error'),
  })

  const canSave = name.trim().length > 0 && !mutation.isPending

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Nueva cuenta financiera</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {fieldLabel('Nombre *')}
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Bancolombia, Caja principal…" style={inputStyle} autoFocus />
          </div>

          <div>
            {fieldLabel('Tipo *')}
            <select value={type} onChange={e => setType(e.target.value as FinancialAccountType)}
              style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}>
              {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            {fieldLabel('Saldo inicial')}
            <input type="number" min={0} step={0.01} value={initialBalance}
              onChange={e => setInitial(e.target.value)}
              placeholder="0" style={inputStyle} />
          </div>

          <div>
            {fieldLabel('Observación (opcional)')}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Notas adicionales…" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose} disabled={mutation.isPending}>Cancelar</GhostBtn>
          <PrimaryBtn onClick={() => mutation.mutate()} disabled={!canSave}>
            {mutation.isPending ? 'Guardando…' : 'Crear cuenta'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Movements drawer ──────────────────────────────────────────────────────────

function MovementsModal({ account, onClose }: { account: FinancialAccountDto; onClose: () => void }) {
  const { data: movements = [], isLoading } = useQuery<FinancialMovementDto[]>({
    queryKey: ['movements', account.id],
    queryFn: () => cashBanksApi.getMovements(account.id),
  })

  const typeColors = TYPE_COLOR[account.accountType]

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ background: typeColors.bg, color: typeColors.color, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100 }}>
                {TYPE_LABEL[account.accountType]}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{account.name}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              {[
                { label: 'Saldo inicial',  value: formatCOP(account.initialBalance), color: 'var(--text-2)' },
                { label: 'Saldo actual',   value: formatCOP(account.currentBalance), color: account.currentBalance >= 0 ? 'var(--pos)' : 'var(--neg)' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Movements table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando movimientos…</div>
          ) : movements.length === 0 ? (
            <div style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Sin movimientos aún. Los pagos realizados desde esta cuenta aparecerán aquí.
            </div>
          ) : (
            <table style={{ ...tableStyle, fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Concepto</th>
                  <th style={thStyle}>Documento</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Saldo anterior</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Saldo posterior</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>{new Date(m.movementDate).toLocaleDateString('es-CO')}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: m.movementType === 'INCOME'
                          ? 'color-mix(in srgb, var(--pos) 15%, transparent)'
                          : 'color-mix(in srgb, var(--neg) 15%, transparent)',
                        color: m.movementType === 'INCOME' ? 'var(--pos)' : 'var(--neg)',
                      }}>
                        {m.movementType === 'INCOME' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {m.concept}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {m.relatedDocument ?? '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: m.movementType === 'INCOME' ? 'var(--pos)' : 'var(--neg)' }}>
                      {m.movementType === 'EXPENSE' ? '− ' : '+ '}{formatCOP(m.amount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-2)' }}>{formatCOP(m.balanceBefore)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCOP(m.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <GhostBtn onClick={onClose}>Cerrar</GhostBtn>
        </div>
      </div>
    </div>
  )
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, onClick }: { account: FinancialAccountDto; onClick: () => void }) {
  const colors = TYPE_COLOR[account.accountType]
  const isNegative = account.currentBalance < 0

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountIcon type={account.accountType} color={colors.color} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{account.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{TYPE_LABEL[account.accountType]}</div>
          </div>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
          background: account.status === 'ACTIVE' ? 'color-mix(in srgb, var(--pos) 15%, transparent)' : 'var(--bg)',
          color: account.status === 'ACTIVE' ? 'var(--pos)' : 'var(--muted)',
        }}>
          {account.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {/* Balance section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Saldo inicial</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(account.initialBalance)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Saldo actual</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isNegative ? 'var(--neg)' : 'var(--pos)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCOP(account.currentBalance)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 14, textAlign: 'right' }}>
        <span style={{ fontSize: 11.5, color: 'var(--accent-text)', fontWeight: 600 }}>Ver movimientos →</span>
      </div>
    </div>
  )
}

function AccountIcon({ type, color }: { type: FinancialAccountType; color: string }) {
  if (type === 'CASH') return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="4" width="13" height="8.5" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <circle cx="8" cy="8.25" r="2" stroke={color} strokeWidth="1.4"/>
    </svg>
  )
  if (type === 'BANK') return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14 4.5v1H2v-1L8 1.5z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="3" y="5.5" width="2" height="6" rx="0.5" fill={color} opacity=".7"/>
      <rect x="7" y="5.5" width="2" height="6" rx="0.5" fill={color}/>
      <rect x="11" y="5.5" width="2" height="6" rx="0.5" fill={color} opacity=".7"/>
      <path d="M2 12.5h12" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke={color} strokeWidth="1.4"/>
      <path d="M5 8h6M5 10.5h3" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CashBanks() {
  const [showNew, setShowNew]           = useState(false)
  const [selected, setSelected]         = useState<FinancialAccountDto | null>(null)

  const { data: accounts = [], isLoading } = useQuery<FinancialAccountDto[]>({
    queryKey: ['financial-accounts'],
    queryFn: cashBanksApi.listAll,
  })

  const totalBalance  = accounts.reduce((s, a) => s + a.currentBalance, 0)
  const cashBalance   = accounts.filter(a => a.accountType === 'CASH').reduce((s, a) => s + a.currentBalance, 0)
  const bankBalance   = accounts.filter(a => a.accountType === 'BANK').reduce((s, a) => s + a.currentBalance, 0)
  const digitalBalance = accounts.filter(a => a.accountType === 'DIGITAL_WALLET').reduce((s, a) => s + a.currentBalance, 0)

  return (
    <div style={{ padding: '24px 26px 40px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.25s ease' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Total en cuentas"    value={formatCOP(totalBalance)} />
        <KpiCard label="Total en cajas"      value={formatCOP(cashBalance)} trendPositive />
        <KpiCard label="Total en bancos"     value={formatCOP(bankBalance)} trendPositive />
        <KpiCard label="Billeteras digitales" value={formatCOP(digitalBalance)} trendPositive />
      </div>

      {/* Accounts list */}
      <Card>
        <CardHeader title="Cuentas financieras" action={
          <PrimaryBtn onClick={() => setShowNew(true)}>+ Nueva cuenta</PrimaryBtn>
        } />

        <div style={{ padding: '18px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
              Cargando cuentas…
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                No hay cuentas financieras aún. Crea una para comenzar.
              </div>
              <PrimaryBtn onClick={() => setShowNew(true)}>+ Nueva cuenta</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {accounts.map(a => (
                <AccountCard key={a.id} account={a} onClick={() => setSelected(a)} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {showNew  && <NewAccountModal onClose={() => setShowNew(false)} />}
      {selected && <MovementsModal account={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
