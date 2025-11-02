/**
 * Common utility types and helpers
 * 
 * Reusable type utilities and generic helpers
 */

// Form state types
export interface FormState<T = unknown> {
  isSubmitting: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
  values: T
}

// Async operation state
export interface AsyncState<T = unknown> {
  data: T | null
  loading: boolean
  error: Error | null
}

// Select option type
export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
  group?: string
}

// Status badge variant type
export type StatusVariant = 
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'default'
  | 'secondary'

// Date range type
export interface DateRange {
  from: Date | string | null
  to: Date | string | null
}

// File upload types
export interface FileUpload {
  file: File
  preview?: string
  progress?: number
  error?: string
}

export interface UploadedFile {
  url: string
  key: string
  size: number
  mimeType: string
  uploadedAt: string
}

// Currency and money types
export interface Money {
  amount: number
  currency: string
}

// Address type
export interface Address {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

// Phone number type
export interface PhoneNumber {
  countryCode: string
  number: string
  extension?: string
}

