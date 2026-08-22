import { useState } from 'react'
import type { PaymentMethod } from '../../api/types'

export interface CheckoutValues {
  fullName: string
  document: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
  paymentMethod: PaymentMethod
  website: string
}

export type CheckoutErrors = Partial<Record<keyof CheckoutValues, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Celular colombiano: 10 dígitos empezando por 3. */
const PHONE = /^3\d{9}$/

export function validate(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {}

  if (!values.fullName.trim()) errors.fullName = 'Necesitamos tu nombre para el despacho'
  const phone = values.phone.replace(/\D/g, '')
  if (!phone) errors.phone = 'Necesitamos un teléfono para coordinar la entrega'
  else if (!PHONE.test(phone)) errors.phone = 'Escribe un celular de 10 dígitos'
  if (values.email.trim() && !EMAIL.test(values.email.trim())) {
    errors.email = 'Ese correo no parece válido'
  }
  if (!values.address.trim()) errors.address = 'Sin dirección no podemos entregar'
  if (!values.city.trim()) errors.city = 'Elige tu ciudad para calcular el envío'

  return errors
}

const INITIAL: CheckoutValues = {
  fullName: '', document: '', phone: '', email: '',
  address: '', city: '', notes: '',
  paymentMethod: 'CASH_ON_DELIVERY',
  website: '',
}

export function useCheckoutForm(initialNote = '') {
  const [values, setValues] = useState<CheckoutValues>({ ...INITIAL, notes: initialNote })
  const [errors, setErrors] = useState<CheckoutErrors>({})

  function setField<K extends keyof CheckoutValues>(key: K, value: CheckoutValues[K]) {
    setValues(prev => ({ ...prev, [key]: value }))
    // El error se limpia al editar: no se castiga al que ya está corrigiendo
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  function validateAll(): boolean {
    const found = validate(values)
    setErrors(found)
    return Object.keys(found).length === 0
  }

  return { values, errors, setField, validateAll }
}
