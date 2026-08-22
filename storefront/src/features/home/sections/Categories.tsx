import { Link } from 'react-router-dom'
import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import { MoreIcon } from '../../../shared/components/ui-icons'
import styles from './Categories.module.css'

interface Tile {
  pill: string
  pillColor: string
  title: string
  href: string
  image: string
  alt: string
  size: 'tall' | 'wide'
}

const TILES: Tile[] = [
  {
    pill: 'Del mar', pillColor: 'var(--lake-sea)', title: 'Pescados',
    href: '/productos?categoria=pescados',
    image: '/img/categoria-pescados.jpg',
    alt: 'Pescados frescos del Pacífico sobre hielo en un cajón de madera',
    size: 'tall',
  },
  {
    pill: 'Del mar', pillColor: 'var(--dreamy-green)', title: 'Mariscos',
    href: '/productos?categoria=mariscos',
    image: '/img/categoria-mariscos.jpg',
    alt: 'Camarones, langosta y piangua sobre hielo',
    size: 'tall',
  },
  {
    pill: 'De la tierra', pillColor: 'var(--saffron)', title: 'Despensa del Pacífico',
    href: '/productos?categoria=despensa',
    image: '/img/categoria-despensa.jpg',
    alt: 'Aceite de coco, achiote y hierbas del Chocó sobre madera',
    size: 'wide',
  },
]

function Tile({ tile }: { tile: Tile }) {
  return (
    <Link
      to={tile.href}
      className={`${styles.tile} ${tile.size === 'tall' ? styles.tall : styles.wide}`}
    >
      <img src={tile.image} alt={tile.alt} loading="lazy" className={styles.image} />
      <span className={styles.veil} />
      <div className={styles.content}>
        <div>
          <span className={styles.pill} style={{ background: tile.pillColor }}>{tile.pill}</span>
          <div className={styles.title}>{tile.title}</div>
        </div>
        <MoreIcon size={24} className={styles.arrow} />
      </div>
    </Link>
  )
}

export function Categories() {
  const [pescados, mariscos, despensa] = TILES
  return (
    <Section tone="cream" aria-labelledby="categorias-title">
      <Container>
        <h2 id="categorias-title" className="sr-only">Categorías</h2>
        <div className={styles.row1}>
          <Tile tile={pescados} />
          <Tile tile={mariscos} />
        </div>
        <Tile tile={despensa} />
      </Container>
    </Section>
  )
}
