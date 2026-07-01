// Shared types — aligned with the backend REST contract

export interface PaginatedResponse<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ErrorResponse {
  status: number
  error: string
  message: string
  timestamp: string
}

export type MovementType =
  | 'ENTRY'
  | 'EXIT'
  | 'WASTE'
  | 'POSITIVE_ADJUSTMENT'
  | 'NEGATIVE_ADJUSTMENT'

export type UnitOfMeasure = 'KG' | 'LB' | 'UNIT' | 'PACKAGE' | 'LITER'

export type ProductType =
  | 'CONSUMER_GOOD'
  | 'RAW_MATERIAL'
  | 'INTERNAL_SUPPLY'
  | 'SERVICE_ASSOCIATED'

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'CANCELLED'

export type SaleStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'CANCELLED'

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'

export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'

export type StockStatus = 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK'
