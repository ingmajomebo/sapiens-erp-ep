import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { Logo } from '../components/Logo'
import { CloseIcon, CollapseIcon, ExpandIcon } from '../components/ui-icons'
import { MEGA_COLUMNS, slugify } from './megaMenuData'
import styles from './MobileMenu.module.css'

const SECTION_LINKS = [
  { label: 'Nuestra costa', href: '/#nuestra-costa' },
  { label: 'Recetas', href: '/#recetas' },
  { label: 'Contacto', href: '/#contacto' },
]

/** Menú a pantalla completa con acordeones. La columna destacada no aparece. */
export function MobileMenu({ onClose }: { onClose: () => void }) {
  const [openColumn, setOpenColumn] = useState<string | null>(null)
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
          {MEGA_COLUMNS.map(column => {
            const isOpen = openColumn === column.heading
            const panelId = `mobile-${slugify(column.heading)}`
            return (
              <div key={column.heading} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowButton}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenColumn(isOpen ? null : column.heading)}
                >
                  {column.heading}
                  {isOpen ? <CollapseIcon /> : <ExpandIcon />}
                </button>
                {isOpen && (
                  <div id={panelId} className={styles.sublist}>
                    {column.links.map(label => (
                      <Link
                        key={label}
                        to={`/productos/${slugify(label)}`}
                        className={styles.sublink}
                        onClick={onClose}
                      >
                        {label}
                      </Link>
                    ))}
                    {column.seeAllHref && (
                      <Link to={column.seeAllHref} className={styles.seeAll} onClick={onClose}>
                        Ver todos →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}

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
