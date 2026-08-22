import { useMemo } from 'react'
import { formatPrice } from '../../shared/format'
import type { Presentation } from '../../api/types'
import styles from './PresentationPicker.module.css'

interface Props {
  presentations: Presentation[]
  selectedId: string
  onSelect: (presentationId: string) => void
}

/** Extrae los gramos de "500 g" o "1 kg" para comparar precio por unidad. */
function gramsOf(axisSize: string): number | null {
  const match = axisSize.toLowerCase().match(/([\d.,]+)\s*(kg|g|l|ml)/)
  if (!match) return null
  const value = parseFloat(match[1].replace(',', '.'))
  if (Number.isNaN(value)) return null
  return match[2] === 'kg' || match[2] === 'l' ? value * 1000 : value
}

/**
 * Selector de dos ejes. El eje "Presentación" solo aparece cuando el producto
 * tiene más de una: dibujar un selector de una sola opción no informa nada.
 */
export function PresentationPicker({ presentations, selectedId, onSelect }: Props) {
  const selected = presentations.find(p => p.id === selectedId) ?? presentations[0]

  const axis1 = useMemo(
    () => [...new Set(presentations.map(p => p.axisPresentation).filter(Boolean))] as string[],
    [presentations],
  )
  const hasAxis1 = axis1.length > 1

  const sizesForSelection = useMemo(
    () => presentations.filter(p => !hasAxis1 || p.axisPresentation === selected.axisPresentation),
    [presentations, hasAxis1, selected.axisPresentation],
  )

  /** La presentación con mejor precio por gramo, si se puede calcular. */
  const bestValueId = useMemo(() => {
    const rated = presentations
      .filter(p => p.available)
      .map(p => ({ id: p.id, ratio: (() => {
        const grams = gramsOf(p.axisSize)
        return grams ? p.price / grams : null
      })() }))
      .filter((p): p is { id: string; ratio: number } => p.ratio !== null)
    if (rated.length < 2) return null
    return rated.reduce((best, p) => (p.ratio < best.ratio ? p : best)).id
  }, [presentations])

  function selectAxis1(value: string) {
    const first = presentations.find(p => p.axisPresentation === value && p.available)
      ?? presentations.find(p => p.axisPresentation === value)
    if (first) onSelect(first.id)
  }

  return (
    <div>
      {hasAxis1 && (
        <div className={styles.axis}>
          <div className={styles.label}>Presentación</div>
          <div className={styles.options}>
            {axis1.map(value => {
              const anyAvailable = presentations.some(
                p => p.axisPresentation === value && p.available)
              const isSelected = selected.axisPresentation === value
              return (
                <button
                  key={value}
                  type="button"
                  className={[
                    styles.option,
                    isSelected ? styles.selected : '',
                    anyAvailable ? '' : styles.disabled,
                  ].filter(Boolean).join(' ')}
                  aria-pressed={isSelected}
                  aria-disabled={!anyAvailable}
                  disabled={!anyAvailable}
                  onClick={() => selectAxis1(value)}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles.axis}>
        <div className={styles.label}>Tamaño</div>
        <div className={styles.options}>
          {sizesForSelection.map(p => {
            const isSelected = p.id === selected.id
            return (
              <button
                key={p.id}
                type="button"
                className={[
                  styles.option,
                  isSelected ? styles.selected : '',
                  p.available ? '' : styles.disabled,
                ].filter(Boolean).join(' ')}
                aria-pressed={isSelected}
                aria-disabled={!p.available}
                disabled={!p.available}
                onClick={() => onSelect(p.id)}
              >
                {p.id === bestValueId && p.available && (
                  <span className={styles.best}>Mejor precio</span>
                )}
                {p.axisSize} · <span className={styles.price}>{formatPrice(p.price)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
