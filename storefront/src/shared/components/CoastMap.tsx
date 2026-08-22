/**
 * Litoral pacífico colombiano: solo la línea de costa, con los tres puntos
 * de compra directa. Trazo fino, sin relleno ni etiquetas de país.
 */

const POINTS = [
  { id: 'bahia-solano', label: 'Bahía Solano', x: 96,  y: 96 },
  { id: 'nuqui',        label: 'Nuquí',        x: 84,  y: 168 },
  { id: 'buenaventura', label: 'Buenaventura', x: 122, y: 286 },
]

export function CoastMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 420"
      className={className}
      role="img"
      aria-label="Litoral pacífico colombiano con Bahía Solano, Nuquí y Buenaventura"
    >
      <title>Nuestras comunidades en el litoral pacífico</title>

      {/* Línea de costa */}
      <path
        d="M118 12c-6 16-14 28-22 40-7 10-10 20-8 30 2 11 9 18 12 28 3 11 0 22-6 31-7 11-16 20-18 32-2 13 5 24 12 34 8 12 14 25 13 39-1 13-8 24-10 37-2 14 3 27 10 39 7 13 15 25 20 39 5 13 6 27 4 41-2 12-6 24-5 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />

      {POINTS.map(p => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="5" fill="var(--pacific-sunset)" />
          <line
            x1={p.x + 9} y1={p.y} x2={p.x + 26} y2={p.y}
            stroke="currentColor" strokeWidth="1" opacity="0.3"
          />
          <text
            x={p.x + 33} y={p.y + 4}
            fontSize="12" fontWeight="700" letterSpacing="1.6"
            fill="currentColor"
          >
            {p.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  )
}
