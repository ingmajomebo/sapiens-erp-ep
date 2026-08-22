import { useState, type FormEvent } from 'react'
import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { Button } from '../../../shared/components/Button'
import styles from './Newsletter.module.css'

/** Pez tipo grabado, dibujado a línea, como fondo de la sección. */
function EngravedFish() {
  return (
    <svg viewBox="0 0 400 220" className={styles.fish} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M20 110c50-58 118-86 176-86s108 28 148 86c-40 58-90 86-148 86s-126-28-176-86Z" />
      <path d="M344 110l46-38v76l-46-38Z" />
      <circle cx="118" cy="88" r="7" />
      <path d="M150 62c16 26 16 70 0 96M186 54c18 32 18 80 0 112M222 58c18 30 18 74 0 104M258 68c16 26 16 62 0 88" />
      <path d="M196 24c14-12 34-16 52-10M196 196c14 12 34 16 52 10" />
    </svg>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Escribe un correo válido para poder avisarte.')
      return
    }
    setError('')
    setDone(true)
  }

  return (
    <Section tone="aqua" className={styles.section} aria-labelledby="newsletter-title">
      <EngravedFish />
      <Container>
        <div className={styles.inner}>
          <h2 id="newsletter-title">Recibe primero lo que llega del mar.</h2>
          <p className={styles.subtitle}>
            Avisamos cuando entra producto de temporada y cuando hay langosta o piangua disponible.
            Un correo cada quince días, nada más.
          </p>

          {done ? (
            <p className={styles.done} role="status">
              Listo. Te escribimos cuando entre producto nuevo.
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="newsletter-email" className="sr-only">Tu correo electrónico</label>
                <input
                  id="newsletter-email"
                  type="email"
                  className={styles.input}
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'newsletter-error' : undefined}
                />
                {error && <p id="newsletter-error" className={styles.error}>{error}</p>}
              </div>
              <Button type="submit" variant="secondary">Suscribirme</Button>
            </form>
          )}
        </div>
      </Container>
    </Section>
  )
}
