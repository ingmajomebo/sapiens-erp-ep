import client from '../../../api/client'
import type { UnitOfMeasure } from '../../../shared/types'

/* ============================================================================
   Transformaciones de inventario.

   Los nombres describen qué le pasa al INVENTARIO, no al documento:
     CONSUMED  el producto SALE del inventario
     OBTAINED  el producto ENTRA al inventario

   Decir "entrada" y "salida" a secas se lee al revés según se mire desde la
   bodega o desde el papel, y esa ambigüedad hace que alguien capture la
   materia prima en el lado equivocado.
   ========================================================================== */

export type TransformationSide = 'CONSUMED' | 'OBTAINED'
export type TransformationLineKind = 'PRODUCT' | 'WASTE'
export type TransformationStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
export type CostingStatus = 'PENDING' | 'COSTED' | 'UNCOSTED'

export interface TransformationLineDto {
  id: string
  side: TransformationSide
  lineKind: TransformationLineKind
  productId: string
  /** Copiados al capturar: si el producto se renombra, esto no cambia. */
  productCode: string | null
  productName: string
  quantity: number
  unit: UnitOfMeasure
  baseQuantity: number | null
  lotId: string | null
  unitCost: number | null
  totalCost: number | null
  referenceSalePrice: number | null
  saleValue: number | null
  allocationWeight: number | null
  allocatedCost: number | null
  resultingUnitCost: number | null
  costingStatus: CostingStatus
}

/** Informa pero NO impide confirmar. */
export interface TransformationWarningDto {
  code: 'NEGATIVE_STOCK' | 'YIELD_ABOVE_100' | 'YIELD_NOT_CALCULABLE' | 'UNCOSTED'
  message: string
}

export interface TransformationDto {
  id: string
  number: string
  transformationDate: string
  status: TransformationStatus
  warehouseId: string | null
  warehouseName: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  confirmedBy: string | null
  confirmedAt: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  inputTotalCost: number | null
  costingStatus: CostingStatus
  yieldPercentage: number | null
  wastePercentage: number | null
  /** False cuando hay unidades que no se pueden convertir entre sí. */
  yieldCalculable: boolean
  consumed: TransformationLineDto[]
  obtained: TransformationLineDto[]
  warnings: TransformationWarningDto[]
  /** Advertencia sobre el método de costeo. Viene del backend, no se inventa. */
  costMethodNotice: string
}

export interface TransformationMovementDto {
  id: string
  productName: string
  movementType: string
  quantity: number
  createdAt: string
  reason: string | null
}

export const transformationApi = {
  list: async (): Promise<TransformationDto[]> => {
    const { data } = await client.get('/inventory/transformations')
    return data
  },

  get: async (id: string): Promise<TransformationDto> => {
    const { data } = await client.get(`/inventory/transformations/${id}`)
    return data
  },

  movements: async (id: string): Promise<TransformationMovementDto[]> => {
    const { data } = await client.get(`/inventory/transformations/${id}/movements`)
    return data
  },

  create: async (req: {
    transformationDate?: string
    warehouseId?: string
    notes?: string
  }): Promise<TransformationDto> => {
    const { data } = await client.post('/inventory/transformations', req)
    return data
  },

  addLine: async (id: string, req: {
    side: TransformationSide
    lineKind?: TransformationLineKind
    productId: string
    quantity: number
  }): Promise<TransformationDto> => {
    const { data } = await client.post(`/inventory/transformations/${id}/lines`, req)
    return data
  },

  removeLine: async (id: string, lineId: string): Promise<TransformationDto> => {
    const { data } = await client.delete(`/inventory/transformations/${id}/lines/${lineId}`)
    return data
  },

  confirm: async (id: string): Promise<TransformationDto> => {
    const { data } = await client.post(`/inventory/transformations/${id}/confirm`)
    return data
  },

  cancel: async (id: string, reason: string): Promise<TransformationDto> => {
    const { data } = await client.post(`/inventory/transformations/${id}/cancel`, { reason })
    return data
  },
}
