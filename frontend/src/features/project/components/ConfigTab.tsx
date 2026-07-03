import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { aiApi } from '../api/projectApi'
import { toast } from '../../../shared/toast'
import { labelStyle, inputStyle, btnPrimaryStyle, btnSecondaryStyle } from './shared'

// ─── Config Tab ───────────────────────────────────────────────────────────────

export function ConfigTab() {
  const qc = useQueryClient()
  const { data: ctx, isLoading } = useQuery({
    queryKey: ['ai-context'],
    queryFn: aiApi.getContext,
  })

  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Sync content when data loads
  useState(() => { if (ctx) setContent(ctx.content) })

  const saveMut = useMutation({
    mutationFn: (c: string) => aiApi.updateContext(c),
    onSuccess: (updated: AiContextDto) => {
      setContent(updated.content)
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['ai-context'] })
      toast({ type: 'success', message: 'Contexto guardado correctamente' })
    },
    onError: () => toast({ type: 'error', message: 'Error al guardar el contexto' }),
  })

  // Initialize content from query
  if (ctx && content === '' && !isDirty) {
    setContent(ctx.content)
  }

  function handleChange(val: string) {
    setContent(val)
    setIsDirty(true)
  }

  function handleReset() {
    if (ctx) { setContent(ctx.content); setIsDirty(false) }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const charCount = content.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Contexto del Asistente IA
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              Este documento define el conocimiento base que recibe el asistente al generar prompts.
              Puedes editarlo para agregar contexto del proyecto, reglas de negocio, arquitectura actualizada
              o cualquier información que mejore la calidad de los prompts generados.
            </div>
            {ctx?.updatedAt && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Última actualización: {new Date(ctx.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: '📐', title: 'Arquitectura', desc: 'Describe la estructura de carpetas, capas y patrones usados' },
          { icon: '⚡', title: 'Invariantes', desc: 'Lista las reglas de negocio que nunca deben violarse' },
          { icon: '📦', title: 'Módulos', desc: 'Documenta qué hace cada módulo y sus dependencias' },
        ].map(tip => (
          <div key={tip.title} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{tip.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{tip.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{tip.desc}</div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {ctx?.label ?? 'Contexto base del Asistente IA'}
            </span>
            {isDirty && (
              <span style={{
                fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e',
                borderRadius: 20, padding: '1px 8px',
              }}>Sin guardar</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {charCount.toLocaleString()} chars · {wordCount.toLocaleString()} palabras
            </span>
            <button
              type="button"
              style={{ fontSize: 11.5, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => { navigator.clipboard.writeText(content); toast({ type: 'success', message: 'Copiado al portapapeles' }) }}
            >
              📋 Copiar
            </button>
          </div>
        </div>

        {/* Textarea */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Cargando contexto...
          </div>
        ) : (
          <textarea
            style={{
              width: '100%', minHeight: 520, padding: '18px 20px',
              border: 'none', outline: 'none', resize: 'vertical',
              fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
              color: 'var(--text)', background: 'var(--surface)',
              boxSizing: 'border-box',
            }}
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Describe el proyecto, arquitectura, invariantes, módulos..."
            spellCheck={false}
          />
        )}

        {/* Footer actions */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
          padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          {isDirty && (
            <button type="button" style={btnSecondaryStyle} onClick={handleReset}>
              Descartar cambios
            </button>
          )}
          <button
            type="button"
            style={{ ...btnPrimaryStyle, background: '#6366f1', opacity: saveMut.isPending ? 0.7 : 1 }}
            disabled={saveMut.isPending || !isDirty}
            onClick={() => saveMut.mutate(content)}
          >
            {saveMut.isPending ? 'Guardando...' : '💾 Guardar contexto'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '14px 18px', fontSize: 13, color: '#166534', lineHeight: 1.6,
      }}>
        <strong>¿Cómo se usa este contexto?</strong> Cada vez que haces click en "🤖 Generar prompt con IA"
        en el formulario de Nuevo Prompt, este documento se envía automáticamente al asistente
        como base de conocimiento del proyecto. Mantenerlo actualizado mejora la calidad y precisión
        de los prompts generados.
      </div>
    </div>
  )
}

