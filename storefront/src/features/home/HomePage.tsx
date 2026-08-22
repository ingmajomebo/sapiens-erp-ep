import { Helmet } from 'react-helmet-async'
import { Hero } from './Hero'
import { Pillars } from './sections/Pillars'
import { Trajectory } from './sections/Trajectory'
import { Categories } from './sections/Categories'
import { HowItWorks } from './sections/HowItWorks'
import { Packaging } from './sections/Packaging'
import { OurCoast } from './sections/OurCoast'
import { Featured } from './sections/Featured'
import { FishingQuote } from './sections/FishingQuote'
import { PartnerBrands } from './sections/PartnerBrands'
import { Testimonials } from './sections/Testimonials'
import { Recipes } from './sections/Recipes'
import { Faq } from './sections/Faq'
import { Newsletter } from './sections/Newsletter'
import { BRAND } from '../../content/brand'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: BRAND.name,
  description: BRAND.description,
  telephone: BRAND.phone,
  email: BRAND.email,
  address: { '@type': 'PostalAddress', addressLocality: 'Medellín', addressCountry: 'CO' },
  url: `https://${BRAND.site}`,
  sameAs: [BRAND.instagramUrl],
}

export function HomePage() {
  return (
    <>
      <Helmet>
        <title>Encanto Pacífico · Pesca artesanal del Pacífico colombiano</title>
        <meta
          name="description"
          content="Pescado y mariscos capturados por pescadores artesanales del Chocó. Empacados el mismo día que salen del agua y enviados con cadena de frío a toda Colombia."
        />
        <link rel="canonical" href={`https://${BRAND.site}/`} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      <Hero />
      <Pillars />
      <Trajectory />
      <Categories />
      <HowItWorks />
      <Packaging />
      <OurCoast />
      <Featured />
      <FishingQuote />
      <PartnerBrands />
      <Testimonials />
      <Recipes />
      <Faq />
      <Newsletter />
    </>
  )
}
