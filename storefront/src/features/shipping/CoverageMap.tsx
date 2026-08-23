import { COVERED_CITIES, ZONES, citiesOfZone } from '../../content/coverage'
import styles from './CoverageMap.module.css'

/*
 * Silueta esquemática de Colombia. NO es cartografía: es un dibujo para
 * ubicarse de un vistazo, del mismo trazo que el mapa del litoral de la home.
 * Por eso no lleva fronteras departamentales ni escala.
 */
const COLOMBIA =
  'M196 18 L206 48 L198 54 L150 52 L120 60 L95 62 L72 66 L52 62 L44 52 ' +
  'L48 78 L44 100 L40 120 L48 140 L56 160 L54 184 L56 208 L72 224 L96 232 ' +
  'L110 250 L128 286 L136 302 L150 280 L170 250 L196 220 L214 190 L222 160 ' +
  'L212 130 L232 110 L210 84 L206 48 Z'

/** De dónde sale el pescado. Coinciden con los orígenes del catálogo. */
const ORIGINS = [
  { id: 'bahia-solano', label: 'Bahía Solano', x: 46,  y: 96 },
  { id: 'nuqui',        label: 'Nuquí',        x: 44,  y: 114 },
  { id: 'buenaventura', label: 'Buenaventura', x: 56,  y: 158 },
]

/** Donde entregamos hoy: el área metropolitana y el oriente antioqueño. */
const DESTINO = { x: 98, y: 96 }

export function CoverageMap() {
  return (
    <div className={styles.wrap}>
      {/* ── Panel 1: el país y el recorrido ─────────────────────────────── */}
      <figure className={styles.panel}>
        <svg viewBox="0 0 260 320" className={styles.map} role="img"
             aria-label="Mapa esquemático de Colombia: el pescado sale del litoral pacífico y se entrega en Antioquia">
          <title>Del Pacífico a Antioquia</title>

          <path d={COLOMBIA} className={styles.country} />

          {/* Recorrido: del litoral al valle. Punteado porque es una ruta,
              no una carretera concreta. */}
          {ORIGINS.map(o => (
            <path
              key={o.id}
              d={`M${o.x} ${o.y} Q ${(o.x + DESTINO.x) / 2} ${(o.y + DESTINO.y) / 2 - 18} ${DESTINO.x} ${DESTINO.y}`}
              className={styles.route}
            />
          ))}

          {ORIGINS.map(o => (
            <g key={o.id}>
              <circle cx={o.x} cy={o.y} r="3" className={styles.origin} />
              <text x={o.x - 7} y={o.y + 3} textAnchor="end" className={styles.originLabel}>
                {o.label}
              </text>
            </g>
          ))}

          {/* Zona con cobertura */}
          <circle cx={DESTINO.x} cy={DESTINO.y} r="14" className={styles.halo} />
          <circle cx={DESTINO.x} cy={DESTINO.y} r="4.5" className={styles.destination} />
          <text x={DESTINO.x + 20} y={DESTINO.y + 4} className={styles.destLabel}>Antioquia</text>
        </svg>
        <figcaption className={styles.caption}>
          Sale del litoral pacífico y llega refrigerado a Antioquia.
        </figcaption>
      </figure>

      {/* ── Panel 2: el detalle de los municipios ───────────────────────── */}
      <figure className={styles.panel}>
        <svg viewBox="0 0 320 300" className={styles.map} role="img"
             aria-label={`Municipios con cobertura: ${COVERED_CITIES.map(c => c.name).join(', ')}`}>
          <title>Municipios con entrega</title>

          {/* El valle: una franja norte-sur, que es como se ordena la ruta */}
          <path
            d="M96 62 Q 78 150 116 250 Q 140 268 158 244 Q 132 150 140 74 Q 120 52 96 62 Z"
            className={styles.zone}
          />
          {/* El oriente, al otro lado de la montaña */}
          <path d="M214 148 Q 236 132 268 156 Q 282 190 254 214 Q 222 208 214 178 Z"
                className={styles.zone} />

          {/* La montaña que separa las dos zonas: explica el día extra */}
          <path d="M172 108 L188 150 L176 196 L192 236" className={styles.ridge} />

          {COVERED_CITIES.map(c => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r="4" className={styles.city} />
              <text
                x={c.x + 9}
                y={c.y + 4}
                className={`${styles.cityLabel} ${c.kind === 'corregimiento' ? styles.minor : ''}`}
              >
                {c.name}
              </text>
            </g>
          ))}
        </svg>
        <figcaption className={styles.caption}>
          Ocho municipios con cobertura. La cordillera entre las dos zonas es la
          razón del día adicional hacia el oriente.
        </figcaption>
      </figure>

      {/* ── Listado, que es lo que de verdad se lee ─────────────────────── */}
      <div className={styles.zones}>
        {ZONES.map(z => (
          <div key={z.id} className={styles.zoneCard}>
            <h3 className={styles.zoneName}>{z.name}</h3>
            <ul className={styles.cityList}>
              {citiesOfZone(z.id).map(c => (
                <li key={c.name}>
                  {c.name}
                  {c.kind === 'corregimiento' && <span className={styles.tagMinor}>corregimiento</span>}
                </li>
              ))}
            </ul>
            <p className={styles.zoneNote}>{z.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
