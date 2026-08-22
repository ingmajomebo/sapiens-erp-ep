import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { toast } from '../../shared/toast'
import { storefrontApi, salesLinkApi, type StorefrontSettings } from '../sales/api/salesApi'

type FieldKind = 'text' | 'area' | 'emoji'

interface Field {
  key: string
  label: string
  help?: string
  kind?: FieldKind
}

interface Group {
  title: string
  description: string
  fields: Field[]
}

/**
 * Descriptor del formulario. Las claves deben existir en la lista blanca
 * ALLOWED_KEYS de StorefrontSettingsService o el PUT las rechaza.
 */
const GROUPS: Group[] = [
  {
    title: 'Cabecera',
    description: 'Lo primero que ve el cliente al abrir el enlace.',
    fields: [
      { key: 'brand_emoji', label: 'Emoji de marca', kind: 'emoji', help: 'Aparece junto al nombre, arriba a la izquierda' },
      { key: 'brand_name', label: 'Nombre del negocio' },
      { key: 'hero_title_1', label: 'Titular — primera línea' },
      { key: 'hero_title_2', label: 'Titular — segunda línea', help: 'Se muestra en cursiva destacada' },
      { key: 'hero_subtitle', label: 'Texto de bienvenida', kind: 'area' },
      { key: 'hero_cta', label: 'Botón principal', help: 'Baja hasta el catálogo' },
    ],
  },
  {
    title: 'Por qué comprarte',
    description: 'Los tres bloques con icono que explican tu propuesta.',
    fields: [
      { key: 'prop1_icon', label: 'Bloque 1 — icono', kind: 'emoji' },
      { key: 'prop1_title', label: 'Bloque 1 — título' },
      { key: 'prop1_text', label: 'Bloque 1 — texto', kind: 'area' },
      { key: 'prop2_icon', label: 'Bloque 2 — icono', kind: 'emoji' },
      { key: 'prop2_title', label: 'Bloque 2 — título' },
      { key: 'prop2_text', label: 'Bloque 2 — texto', kind: 'area' },
      { key: 'prop3_icon', label: 'Bloque 3 — icono', kind: 'emoji' },
      { key: 'prop3_title', label: 'Bloque 3 — título' },
      { key: 'prop3_text', label: 'Bloque 3 — texto', kind: 'area' },
    ],
  },
  {
    title: 'Catálogo',
    description: 'La sección donde el cliente elige productos.',
    fields: [
      { key: 'catalog_eyebrow', label: 'Etiqueta pequeña' },
      { key: 'catalog_title', label: 'Título de la sección' },
      { key: 'catalog_empty', label: 'Mensaje si no hay productos', kind: 'area' },
    ],
  },
  {
    title: 'Pedido',
    description: 'El formulario donde el cliente revisa y envía.',
    fields: [
      { key: 'order_eyebrow', label: 'Etiqueta pequeña' },
      { key: 'order_title', label: 'Título de la sección' },
      { key: 'order_empty', label: 'Mensaje con el carrito vacío', kind: 'area' },
      { key: 'order_total_label', label: 'Etiqueta del total' },
      { key: 'delivery_question', label: 'Pregunta de entrega' },
      { key: 'pickup_label', label: 'Botón — recoger en local' },
      { key: 'delivery_label', label: 'Botón — envío a domicilio' },
      { key: 'address_placeholder', label: 'Campo de dirección' },
      { key: 'notes_placeholder', label: 'Campo de notas', kind: 'area' },
      { key: 'submit_button', label: 'Botón de enviar', help: 'El total se añade automáticamente al final' },
      { key: 'submit_error', label: 'Mensaje si falla el envío', kind: 'area' },
      { key: 'cart_button', label: 'Botón de la barra del carrito' },
    ],
  },
  {
    title: 'Confirmación',
    description: 'La pantalla tras enviar el pedido.',
    fields: [
      { key: 'confirm_eyebrow', label: 'Etiqueta pequeña' },
      { key: 'confirm_title', label: 'Titular' },
      { key: 'confirm_message', label: 'Mensaje', kind: 'area' },
      { key: 'confirm_note', label: 'Nota al pie del resumen', kind: 'area' },
    ],
  },
  {
    title: 'Pie de página',
    description: 'Datos de contacto del negocio.',
    fields: [
      { key: 'footer_tagline', label: 'Lema' },
      { key: 'footer_address', label: 'Dirección' },
      { key: 'footer_hours', label: 'Horario' },
      { key: 'footer_phone', label: 'Teléfono' },
    ],
  },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}

export function StorefrontSection() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<StorefrontSettings>({})

  const { data: saved = {}, isLoading } = useQuery({
    queryKey: ['storefront-settings'],
    queryFn: storefrontApi.getAll,
  })

  const { data: links = [] } = useQuery({
    queryKey: ['sales-order-links'],
    queryFn: salesLinkApi.listAll,
  })

  // Solo se envían las claves realmente modificadas
  const changed = useMemo(
    () => Object.fromEntries(Object.entries(draft).filter(([k, v]) => v !== saved[k])),
    [draft, saved],
  )
  const dirtyCount = Object.keys(changed).length

  const saveMut = useMutation({
    mutationFn: () => storefrontApi.update(changed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storefront-settings'] })
      setDraft({})
      toast('Página de venta actualizada', 'success')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(msg ?? 'No se pudieron guardar los cambios', 'error')
    },
  })

  const valueOf = (key: string) => draft[key] ?? saved[key] ?? ''
  const setValue = (key: string, v: string) => setDraft(prev => ({ ...prev, [key]: v }))

  const activeLink = links.find(l => l.active)
  const previewUrl = activeLink ? `${window.location.origin}/pedido/${activeLink.token}` : null

  if (isLoading) {
    return <Card><div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Cargando textos…</div></Card>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Página pública de pedidos</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
              Estos textos son los que ve tu cliente. Los productos se publican desde el catálogo.
            </div>
          </div>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Ver la página ↗
            </a>
          )}
          <Button variant="primary" disabled={dirtyCount === 0} loading={saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {dirtyCount === 0 ? 'Sin cambios' : `Guardar ${dirtyCount} cambio${dirtyCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </Card>

      {GROUPS.map(group => (
        <Card key={group.title}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{group.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, marginBottom: 18 }}>
              {group.description}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {group.fields.map(f => {
                const isDirty = f.key in changed
                return (
                  <div key={f.key} style={{ gridColumn: f.kind === 'area' ? '1 / -1' : undefined }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                      {f.label}
                      {isDirty && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />}
                    </div>
                    {f.kind === 'area' ? (
                      <textarea
                        style={{ ...inputStyle, minHeight: 62, resize: 'vertical' }}
                        value={valueOf(f.key)}
                        onChange={e => setValue(f.key, e.target.value)}
                      />
                    ) : (
                      <input
                        style={{ ...inputStyle, ...(f.kind === 'emoji' ? { maxWidth: 90, textAlign: 'center', fontSize: 18 } : {}) }}
                        value={valueOf(f.key)}
                        onChange={e => setValue(f.key, e.target.value)}
                      />
                    )}
                    {f.help && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{f.help}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
