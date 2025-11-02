/**
 * Enterprise-level type definitions
 * 
 * This module centralizes all shared TypeScript types and interfaces
 * used across the application.
 */

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// Database-related types
export type DatabaseTimestamp = string
export type UUID = string

// Pagination types
export interface PaginationParams {
  page?: number
  pageSize?: number
  offset?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// Sorting types
export interface SortParams {
  sort?: string
  dir?: 'asc' | 'desc'
}

// Filter types
export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined
}

// Query types (combines pagination, sorting, filtering)
export interface QueryParams extends PaginationParams, SortParams {
  q?: string // search query
  [key: string]: string | number | boolean | null | undefined
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  stack?: string
}

// Entity status types
export type EntityStatus = 'active' | 'inactive' | 'archived' | 'pending' | 'draft'

// Audit log types
export interface AuditLogEntry {
  id: UUID
  organization_id: UUID
  entity_type: string
  entity_id: UUID
  action: string
  changed_at: DatabaseTimestamp
  changed_by: Nullable<UUID>
  old_values: Nullable<Record<string, unknown>>
  new_values: Nullable<Record<string, unknown>>
}

// User-related types
export interface BaseUser {
  id: UUID
  email: string
  first_name: Nullable<string>
  last_name: Nullable<string>
  avatar_url: Nullable<string>
}

// Re-export domain-specific types (these will be defined in their respective modules)
export * from './database'
export * from './api'
export * from './common'

