import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Container } from '../../shared/components/Container'
import { Eyebrow } from '../../shared/components/Eyebrow'
import { formatDate, formatPrice } from '../../shared/format'
import { storeApi } from '../../api/storeApi'
import { ORDER_STEPS, ORDER_STEP_LABELS } from '../../api/types'
import { BRAND } from '../../content/brand'
import styles from './TrackingPage.module.css'

export function TrackingPage() {
  const { trackingToken = '' } = useParams()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', trackingToken],
    queryFn: () => storeApi.trackOrder(trackingToken),
  })

  if (isLoading) return <Container><p className={styles.state}>Buscando tu pedido…</p></Container>
  if (isError || !order) {
    return (
      <Container>
        <p className={styles.state}>
          No encontramos ese pedido. Revisa el enlace o escríbenos por WhatsApp al {BRAND.phone}.
        </p>
      </Container>
    )
  }

  const cancelled = order.status === 'CANCELLED'
  const currentIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number])

  return (
    <>
      <Helmet>
        <title>{`Pedido ${order.number} · Encanto Pacífico`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Container>
        <div className={styles.wrap}>
          <Eyebrow style={{ color: 'var(--pacific-sunset)' }}>
            {cancelled ? 'Pedido cancelado' : 'Pedido recibido'}
          </Eyebrow>
          <h1 className={styles.title}>Pedido {order.number}</h1>
          <p className={styles.meta}>
            {formatDate(order.placedAt)} · {order.customerName} · {order.shippingCity} ·{' '}
            {formatPrice(order.total)}
          </p>

          {cancelled ? (
            <div className={styles.cancelled}>
              Este pedido fue cancelado.
              {order.cancelReason && <> Motivo: {order.cancelReason}</>}
            </div>
          ) : (
            <ol className={styles.steps}>
              {ORDER_STEPS.map((step, i) => {
                const reached = i <= currentIndex
                return (
                  <li key={step} className={styles.step}>
                    <div className={`${styles.stepBar} ${reached ? styles.stepBarActive : ''}`} />
                    <div className={`${styles.stepLabel} ${reached ? styles.stepLabelActive : ''}`}>
                      {ORDER_STEP_LABELS[step]}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          {order.paymentMethod === 'BANK_TRANSFER' && !cancelled && (
            <div className={styles.transfer}>
              <div className={styles.transferTitle}>Completa tu pago por transferencia</div>
              <div className={styles.transferRow}><span>Nequi</span><b>{BRAND.phone}</b></div>
              <div className={styles.transferRow}><span>Bancolombia · Ahorros</span><b>Pendiente</b></div>
              <p className={styles.transferNote}>
                Envíanos el comprobante por WhatsApp al {BRAND.phone} <b>citando el número
                de pedido {order.number}</b>. Despachamos apenas verifiquemos el pago.
              </p>
            </div>
          )}

          <div className={styles.lines}>
            {order.lines.map((line, i) => (
              <div key={i} className={styles.line}>
                <span>
                  {line.productName}{' '}
                  <span className={styles.linePresentation}>
                    {line.presentationName} × {line.quantity}
                  </span>
                </span>
                <span>{formatPrice(line.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <div className={styles.totalRow}>
              <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Envío</span>
              <span>{order.shippingCost === 0 ? 'Gratis' : formatPrice(order.shippingCost)}</span>
            </div>
            <div className={styles.totalFinal}>
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <p className={styles.keep}>
            Guarda este enlace: puedes volver cuando quieras para ver en qué va tu pedido.
          </p>
        </div>
      </Container>
    </>
  )
}
