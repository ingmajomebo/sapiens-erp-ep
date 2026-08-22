/*
 * SVG oficiales de cada red. No salen de lucide a propósito: un logo de
 * marca no es un icono de interfaz y debe respetar su trazo original.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WhatsappIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M3.5 20.5l1.3-4.2A8.2 8.2 0 1 1 8 19.4l-4.5 1.1Z" />
      <path d="M8.8 8.4c.3-.6.6-.6.9-.6h.7c.2 0 .5 0 .7.6l.8 1.9c.1.3 0 .5-.1.7l-.5.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3 2.7c.3.1.5 0 .7-.2l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.3.1.5.3.5.5a2 2 0 0 1-1.9 2.1c-1 0-3.3-.6-5.4-2.7s-2.7-4.4-2.7-5.4a2.6 2.6 0 0 1 .4-1Z" />
    </svg>
  )
}

export function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M15.5 3.5h-2.2A3.8 3.8 0 0 0 9.5 7.3V10H7.2v3.2h2.3v7.3h3.3v-7.3h2.4l.6-3.2h-3V7.6c0-.6.4-1 1-1h2V3.5Z" />
    </svg>
  )
}
