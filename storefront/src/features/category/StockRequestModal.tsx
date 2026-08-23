import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../../shared/components/Button'
import { CloseIcon } from '../../shared/components/ui-icons'
import { formatPrice } from '../../shared/format'
import { storeApi } from '../../api/storeApi'
import type { CatalogItem } from '../../api/types'
import styles from './StockRequestModal.module.css'

interface Props {
  item: CatalogItem
  onClose: () => void
}

/**
 * Pide los datos mínimos para avisar cuando el producto vuelva.
 *
 * No crea un pedido ni reserva stock: prometer una entrega que el almacén no
 * puede respaldar sería peor que no ofrecer nada. Lo que registra es una
 * intención de compra que alguien atiende.
 */
export function StockRequestModal({ item, onClose }: Props) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [website, setWebsite] = useState('')   // honeypot
  const dialogRef = useRef<HTMLDivElement>(null)
  const primeroRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => storeApi.requestStock({
      presentationId: item.id,
      customerName: nombre.trim(),
      phone: telefono.trim(),
      email: correo.trim() || undefined,
      desiredQuantity: Number(cantidad) || undefined,
      website,
    }),
  })

  // Esc cierra, y el foco entra al diálogo para que el teclado no se pierda
  useEffect(() => {
    primeroRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const listo = nombre.trim().length > 2 && telefono.trim().length >= 7

  if (mutation.isSuccess) {
    return (
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.dialog} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
          <h2 className={styles.title}>Listo, quedaste anotado</h2>
          <p className={styles.text}>
            {mutation.data.alreadyRegistered
              ? 'Ya teníamos tu solicitud para este producto y acabamos de actualizar tus datos.'
              : `Te escribimos a ${telefono.trim()} en cuanto llegue ${item.groupName} · ${item.variantName}.`}
          </p>
          <Button variant="primary" fullWidth onClick={onClose}>Seguir viendo</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-titulo"
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>

        <h2 id="aviso-titulo" className={styles.title}>Te avisamos cuando llegue</h2>

        <div className={styles.product}>
          {item.imageUrl && <img src={item.imageUrl} alt="" className={styles.thumb} />}
          <div>
            <p className={styles.productName}>{item.groupName}</p>
            <p className={styles.productVariant}>{item.variantName} · {formatPrice(item.price)}</p>
          </div>
        </div>

        <p className={styles.text}>
          Este producto se consigue sobre pedido. Déjanos tus datos y te
          escribimos apenas tengamos existencias.
        </p>

        <form
          className={styles.form}
          onSubmit={e => { e.preventDefault(); if (listo) mutation.mutate() }}
        >
          <label className={styles.field}>
            <span>Nombre</span>
            <input ref={primeroRef} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span>Teléfono</span>
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                inputMode="tel"
                placeholder="3001234567"
                required
              />
            </label>
            <label className={`${styles.field} ${styles.narrow}`}>
              <span>Cantidad</span>
              <input
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Correo <em>(opcional)</em></span>
            <input value={correo} onChange={e => setCorreo(e.target.value)} type="email" />
          </label>

          {/* Honeypot: invisible para personas, irresistible para bots */}
          <input
            className={styles.honeypot}
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {mutation.isError && (
            <p className={styles.error}>
              No pudimos registrar tu solicitud. Inténtalo de nuevo en un momento.
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={!listo || mutation.isPending}>
            {mutation.isPending ? 'Enviando…' : 'Avísenme'}
          </Button>
        </form>
      </div>
    </div>
  )
}
