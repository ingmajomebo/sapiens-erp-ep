import { useAppStore } from '../../store/useAppStore'
import { translations } from '../../i18n/translations'

export function Accounting() {
  const { lang, setPage } = useAppStore()
  const t = translations[lang]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 64px)', gap: 16, animation: 'fadeUp 0.25s ease',
    }}>
      <div style={{ fontSize: 48 }}>📊</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{t.coming_soon}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        El módulo de <strong>Contabilidad</strong> (P&G, flujo de caja, balance general) estará disponible próximamente.
      </div>
      <button
        onClick={() => setPage('dashboard')}
        style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontSize: 13, fontWeight: 600 }}
      >
        ← Volver al panel
      </button>
    </div>
  )
}
