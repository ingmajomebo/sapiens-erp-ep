import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../components/Container'
import { Logo } from '../components/Logo'
import { CloseIcon, CollapseIcon, ExpandIcon } from '../components/ui-icons'
import { storeApi } from '../../api/storeApi'
import styles from './MobileMenu.module.css'

/** Páginas propias: van con Link para no recargar la aplicación entera. */
const PAGE_LINKS = [
  { label: 'Envíos', to: '/envios' },
]

/** Anclas del home: necesitan navegación completa para saltar a la sección. */
const SECTION_LINKS = [
  { label: 'Nuestra costa', href: '/#nuestra-costa' },
  { label: 'Recetas', href: '/#recetas' },
  { label: 'Contacto', href: '/#contacto' },
]

/** Menú a pantalla completa con acordeones. La columna destacada no aparece. */
export function MobileMenu({ onClose }: { onClose: () => void }) {
  const [openColumn, setOpenColumn] = useState<string | null>(null)

  /* Mismo origen que el megamenú de escritorio: lo publicado, no una lista
     escrita a mano. Comparte caché, así que abrir el menú no pide nada. */
  const { data: portadas = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => storeApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  })
  const categorias = portadas.filter(c => c.kind === 'CATEGORY')
  const closeRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return

      // Foco atrapado dentro del menú mientras está abierto
      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
    >
      <Container>
        <div className={styles.top}>
          <Link to="/" onClick={onClose} aria-label="Encanto Pacífico — ir al inicio">
            <Logo tone="oscuro" />
          </Link>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar menú">
            <CloseIcon size={24} />
          </button>
        </div>

        <div className={styles.body}>
          {categorias.map(categoria => {
            const isOpen = openColumn === categoria.slug
            const panelId = `mobile-${categoria.slug}`
            const especies = portadas.filter(c => c.parentSlug === categoria.slug)
            return (
              <div key={categoria.slug} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowButton}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenColumn(isOpen ? null : categoria.slug)}
                >
                  {categoria.title}
                  {isOpen ? <CollapseIcon /> : <ExpandIcon />}
                </button>
                {isOpen && (
                  <div id={panelId} className={styles.sublist}>
                    {especies.map(especie => (
                      <Link
                        key={especie.slug}
                        to={`/${categoria.slug}/${especie.slug}`}
                        className={styles.sublink}
                        onClick={onClose}
                      >
                        {especie.title}
                      </Link>
                    ))}
                    <Link to={`/${categoria.slug}`} className={styles.seeAll} onClick={onClose}>
                      Ver todos →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}

          {PAGE_LINKS.map(link => (
            <div key={link.to} className={styles.row}>
              <Link to={link.to} className={styles.rowLink} onClick={onClose}>
                {link.label}
              </Link>
            </div>
          ))}

          {SECTION_LINKS.map(link => (
            <div key={link.href} className={styles.row}>
              <a href={link.href} className={styles.rowLink} onClick={onClose}>
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}
