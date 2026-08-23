/* ============================================================================
   Contenido de la página de envíos.

   Los horarios reproducen lo que el sitio YA afirma en la home y en la barra
   superior ("Pedidos antes de las 2:00 p.m. salen el mismo día"). Se toman de
   ahí a propósito: dos páginas con horarios distintos son peores que ninguna.

   CONFIRMADO: el corte de las 2:00 p.m.
   SIN CONFIRMAR, y por eso ausentes de la página: tarifas por zona, pedido
   mínimo, umbral de envío gratis y tiempos de entrega por municipio.
   Son compromisos con el cliente, no texto de relleno.
   ========================================================================== */

export interface ScheduleStep {
  title: string
  text: string
}

export const SCHEDULE: ScheduleStep[] = [
  {
    title: 'Haces el pedido',
    text: 'Los pedidos confirmados antes de las 2:00 p.m. entran al despacho del mismo día. Después de esa hora pasan al siguiente.',
  },
  {
    title: 'Se alista y se empaca',
    text: 'Cada corte se sella al vacío por porción y se acomoda en nevera de icopor con hielo seco. La nevera sale con cinta de seguridad.',
  },
  {
    // Sin tiempos por zona: no están confirmados y prometer una fecha que no
    // se cumple hace más daño que no darla.
    title: 'Sale a ruta',
    text: 'La nevera sale con la ruta del día. Te confirmamos por WhatsApp cuándo llega según tu municipio.',
  },
  {
    title: 'Recibes',
    text: 'Se verifica la temperatura al entregar. Si la cinta de seguridad viene abierta, no recibas el pedido: lo reponemos.',
  },
]

export interface PackagingNote {
  title: string
  text: string
}

export const PACKAGING_NOTES: PackagingNote[] = [
  {
    title: 'Sellado al vacío',
    text: 'Sin aire no hay quemadura por frío. Cada porción va con su etiqueta a la vista.',
  },
  {
    title: 'Nevera con hielo seco',
    text: 'La cadena de frío se verifica al salir de bodega y otra vez al entregar. La cinta de seguridad es la prueba de que nadie la abrió en el camino.',
  },
  {
    title: 'Trazabilidad por lote',
    text: 'Cada empaque lleva su número de lote. Con ese número sabemos qué día se pescó, quién lo pescó y en qué comunidad.',
  },
]
