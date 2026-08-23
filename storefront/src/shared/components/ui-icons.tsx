import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fish,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Truck,
  Waves,
  X,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'

/* ============================================================================
   Iconografía de la tienda. Todo sale de lucide-react.

   Este módulo existe por dos reglas fáciles de romper a mano:
     · strokeWidth siempre 1.5 — el 2 por defecto pesa demasiado para la marca.
     · un icono, un significado — por eso se exportan nombres semánticos y no
       los de lucide: si algún día "Origen" cambia de símbolo, se cambia aquí
       y en ningún otro sitio.

   Los iconos de redes sociales NO están aquí: usan el SVG oficial de cada
   marca, en SocialIcons.tsx.
   ========================================================================== */

const STROKE = 1.5

/** Tamaños permitidos: 18 inline · 20 interfaz · 24 acciones · 32 sección · 64 estado vacío. */
export type IconSize = 18 | 20 | 24 | 32 | 64

interface IconProps extends Omit<LucideProps, 'size' | 'strokeWidth'> {
  size?: IconSize
}

function bind(Icon: LucideIcon, defaultSize: IconSize) {
  return function BoundIcon({ size = defaultSize, ...rest }: IconProps) {
    // strokeWidth va después del spread para que nadie pueda sobrescribirlo
    return <Icon size={size} {...rest} strokeWidth={STROKE} />
  }
}

/* ── Interfaz ────────────────────────────────────────────────────────────── */
export const CartIcon      = bind(ShoppingBag,  20)
export const SearchIcon    = bind(Search,       20)
export const CloseIcon     = bind(X,            20)
export const MenuIcon      = bind(Menu,         20)
export const RemoveIcon    = bind(X,            18)

/* ── Acordeones y stepper ────────────────────────────────────────────────── */
export const ExpandIcon    = bind(Plus,         20)
export const CollapseIcon  = bind(Minus,        20)
export const IncreaseIcon  = bind(Plus,         18)
export const DecreaseIcon  = bind(Minus,        18)

/* ── Navegación ──────────────────────────────────────────────────────────── */
export const PrevIcon      = bind(ChevronLeft,  20)
export const NextIcon      = bind(ChevronRight, 20)
export const DropdownIcon  = bind(ChevronDown,  20)
export const MoreIcon      = bind(ArrowRight,   18)

/* ── Atributos de producto y marca ───────────────────────────────────────── */
export const OriginIcon    = bind(MapPin,       18)
export const FreshnessIcon = bind(Snowflake,    18)
export const OceanIcon     = bind(Waves,        18)
export const QualityIcon   = bind(BadgeCheck,   18)
export const ShippingIcon  = bind(Truck,        18)
export const PackagingIcon = bind(Package,      18)

/* ── Mensajes ────────────────────────────────────────────────────────────── */
export const ErrorIcon     = bind(AlertCircle,  18)
export const GuaranteeIcon = bind(ShieldCheck,  24)

/* ── Estados vacíos ──────────────────────────────────────────────────────── */
/** El carrito sin nada. Grande y a trazo fino: acompaña, no regaña. */
export const EmptyCartIcon = bind(Fish,         64)

/** Los cuatro pilares del brand book, cada uno con su símbolo propio. */
export const PILLAR_ICONS = {
  origen:         OriginIcon,
  frescura:       FreshnessIcon,
  sostenibilidad: OceanIcon,
  calidad:        QualityIcon,
} as const
