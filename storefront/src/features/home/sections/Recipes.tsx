import { Container } from '../../../shared/components/Container'
import { Section } from '../../../shared/components/Section'
import styles from './Recipes.module.css'

const RECIPES = [
  { slug: 'encocado-de-pargo', title: 'Encocado de pargo', time: '40 min',
    image: '/img/receta-encocado-de-pargo.jpg',
    alt: 'Encocado de pargo en salsa de coco servido en cazuela de barro' },
  { slug: 'ceviche-de-camaron', title: 'Ceviche de camarón del Pacífico', time: '25 min',
    image: '/img/receta-ceviche-de-camaron.jpg',
    alt: 'Ceviche de camarón del Pacífico con cebolla morada y cilantro' },
  { slug: 'arroz-con-jaiba', title: 'Arroz con jaiba', time: '50 min',
    image: '/img/receta-arroz-con-jaiba.jpg',
    alt: 'Arroz con jaiba servido en olla de barro' },
]

export function Recipes() {
  return (
    <Section id="recetas" tone="cream" aria-labelledby="recetas-title">
      <Container>
        <div className={styles.head}>
          <h2 id="recetas-title">Recetas del Pacífico</h2>
        </div>
        <div className={styles.grid}>
          {RECIPES.map(recipe => (
            <article key={recipe.slug} className={styles.card}>
              <div className={styles.media}>
                <img src={recipe.image} alt={recipe.alt} width={1200} height={800}
                  loading="lazy" className={styles.image} />
                <span className={styles.time}>{recipe.time}</span>
              </div>
              <h3 className={styles.title}>{recipe.title}</h3>
              <div className={styles.link}>Ver receta →</div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  )
}
