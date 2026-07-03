import { GhostBtn } from '../../shared/helpers'

/** Ficha del cliente — se completa con métricas y gráfica en la siguiente iteración. */
export function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  return (
    <div style={{ padding: '24px 26px' }}>
      <GhostBtn style={{ fontSize: 12.5, padding: '6px 12px' }} onClick={onBack}>← Clientes</GhostBtn>
      <div style={{ marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
        Ficha del cliente {customerId} en construcción.
      </div>
    </div>
  )
}
