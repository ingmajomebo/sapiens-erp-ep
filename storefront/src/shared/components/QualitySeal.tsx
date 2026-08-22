import { QUALITY_SEAL } from '../../content/brand'

/**
 * Sello circular impreso en la caja de envío (Brand Guideline, aplicaciones).
 * Se dibuja en SVG para poder escalarlo y teñirlo con el color del contexto.
 */
export function QualitySeal({ size = 132 }: { size?: number }) {
  const label = `${QUALITY_SEAL.top} · ${QUALITY_SEAL.center} · ${QUALITY_SEAL.bottom}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label}>
      <defs>
        <path id="seal-top" d="M100 178a78 78 0 0 1 0-156 78 78 0 0 1 0 156" fill="none" />
        <path id="seal-bottom" d="M100 26a74 74 0 0 0 0 148 74 74 0 0 0 0-148" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="1.5" />

      <text fontSize="13" fontWeight="700" letterSpacing="3.4" fill="currentColor">
        <textPath href="#seal-top" startOffset="25%" textAnchor="middle">
          {QUALITY_SEAL.top.toUpperCase()}
        </textPath>
      </text>
      <text fontSize="10" fontWeight="700" letterSpacing="2.2" fill="currentColor">
        <textPath href="#seal-bottom" startOffset="25%" textAnchor="middle">
          {QUALITY_SEAL.bottom.toUpperCase()}
        </textPath>
      </text>

      {/* Pez central, silueta simplificada del isotipo */}
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M74 100c8-11 18-16 26-16s18 5 26 16c-8 11-18 16-26 16s-18-5-26-16Z" />
        <path d="M126 100l10-7v14l-10-7Z" />
        <path d="M92 92c4 4 4 12 0 16M108 92c4 4 4 12 0 16" />
      </g>

      <text
        x="100" y="140" textAnchor="middle"
        fontSize="17" fontWeight="700" letterSpacing="4" fill="currentColor"
      >
        {QUALITY_SEAL.center.toUpperCase()}
      </text>
    </svg>
  )
}
