import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'text'

interface CommonProps {
  variant?: ButtonVariant
  children: ReactNode
  fullWidth?: boolean
  className?: string
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

function classesFor(variant: ButtonVariant, fullWidth?: boolean, extra?: string): string {
  return [styles.base, styles[variant], fullWidth ? styles.full : '', extra]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  children,
  fullWidth,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, fullWidth, className)} {...rest}>
      <span>{children}</span>
    </button>
  )
}

interface ButtonLinkProps extends CommonProps {
  to: string
}

/** Misma piel que Button, pero navega. Para los CTA que van a una ruta. */
export function ButtonLink({
  to,
  variant = 'primary',
  children,
  fullWidth,
  className,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={classesFor(variant, fullWidth, className)}>
      <span>{children}</span>
    </Link>
  )
}
