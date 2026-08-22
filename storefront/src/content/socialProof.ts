/* ============================================================================
   ⚠️  DATOS PENDIENTES DE CONFIRMAR — NO PUBLICAR ASÍ
   ----------------------------------------------------------------------------
   Todo lo de este archivo son marcadores de posición con estructura correcta
   pero contenido inventado. Son afirmaciones sobre un negocio
   real: trayectoria, clientes y testimonios. Publicarlas sin verificar sería
   presentar como ciertas cosas que nadie ha dicho.

   Reemplazar antes de salir a producción:
     · TRAJECTORY  → años reales de operación y cifras auditables
     · PARTNER_BRANDS → solo clientes con autorización de uso de marca
     · TESTIMONIALS → testimonios reales con consentimiento por escrito

   Mientras PENDING_REAL_DATA sea true, las secciones muestran un aviso
   discreto en desarrollo para que nadie lo publique por accidente.
   ========================================================================== */

export const PENDING_REAL_DATA = true

/** Trayectoria y cifras de confianza. */
export const TRAJECTORY = {
  /** Año en que arrancó la operación. */
  foundedYear: 2019,
  headline: 'Llevamos {years} años llevando el Pacífico a los hogares colombianos.',
  body:
    'Empezamos comprando directo a pescadores de Bahía Solano y Nuquí, sin intermediarios. Hoy despachamos a hogares de todo el país manteniendo el mismo trato: precio justo en la orilla y cadena de frío sin cortes hasta la puerta.',
  stats: [
    { value: '2.400+', label: 'Hogares atendidos' },
    { value: '38',     label: 'Pescadores aliados' },
    { value: '3',      label: 'Comunidades del Chocó' },
    { value: '24 h',   label: 'Del mar al empaque' },
  ],
}

/** Restaurantes, hoteles y aliados que compran a Encanto Pacífico. */
export const PARTNER_BRANDS = [
  { name: 'Cliente 1', logo: null },
  { name: 'Cliente 2', logo: null },
  { name: 'Cliente 3', logo: null },
  { name: 'Cliente 4', logo: null },
  { name: 'Cliente 5', logo: null },
  { name: 'Cliente 6', logo: null },
]

/** Testimonios largos, con foto y consentimiento. */
export const TESTIMONIALS = [
  {
    quote: 'Testimonio pendiente. Cita real de un cliente, con su autorización.',
    author: 'Nombre Apellido',
    role: 'Cliente desde 20XX · Medellín',
  },
  {
    quote: 'Testimonio pendiente. Cita real de un cliente, con su autorización.',
    author: 'Nombre Apellido',
    role: 'Cliente desde 20XX · Bogotá',
  },
]

/** Años cumplidos, calculado del año de fundación. */
export function yearsInBusiness(): number {
  return new Date().getFullYear() - TRAJECTORY.foundedYear
}
