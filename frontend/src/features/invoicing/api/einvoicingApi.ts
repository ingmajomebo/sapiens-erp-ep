import client from '../../../api/client'

/**
 * Estado de una factura ante la DIAN.
 *
 * `NOT_SENT` no viene del backend como estado del documento: es lo que
 * responde cuando la factura todavía no tiene rastro electrónico, sea porque
 * no hay proveedor configurado o porque se emitió antes de activarlo.
 */
export type ElectronicStatus =
  | 'NOT_SENT'
  | 'PENDING'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED'

export interface ElectronicStatusDto {
  enabled: boolean
  provider: string
  environment: string
  status: ElectronicStatus
  cufe: string | null
  pdfUrl: string | null
  qrUrl: string | null
  xmlUrl: string | null
  dianCode: string | null
  dianMessage: string | null
  lastError: string | null
  attempts: number
  submittedAt: string | null
  acceptedAt: string | null
  retryable: boolean
}

export const einvoicingApi = {
  status: async (invoiceId: string): Promise<ElectronicStatusDto> => {
    const { data } = await client.get(`/sales-invoices/${invoiceId}/electronic`)
    return data
  },
  submit: async (invoiceId: string): Promise<ElectronicStatusDto> => {
    const { data } = await client.post(`/sales-invoices/${invoiceId}/electronic/submit`)
    return data
  },
  refresh: async (invoiceId: string): Promise<ElectronicStatusDto> => {
    const { data } = await client.post(`/sales-invoices/${invoiceId}/electronic/refresh`)
    return data
  },
}

/** Etiqueta y color del chip. El chip solo entiende ok/warn/neg/muted. */
export const ELECTRONIC_LABELS: Record<ElectronicStatus, string> = {
  NOT_SENT: 'Sin enviar',
  PENDING: 'Pendiente de envío',
  SUBMITTED: 'En proceso en la DIAN',
  ACCEPTED: 'Aceptada por la DIAN',
  REJECTED: 'Rechazada por la DIAN',
  FAILED: 'Falló el envío',
}

export const ELECTRONIC_CHIP: Record<ElectronicStatus, string> = {
  NOT_SENT: 'muted',
  PENDING: 'pending',
  SUBMITTED: 'pending',
  ACCEPTED: 'ok',
  REJECTED: 'critical',
  FAILED: 'critical',
}
