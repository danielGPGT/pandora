/**
 * API request/response type definitions
 * 
 * Types for API endpoints, request payloads, and response structures
 */

import type { QueryParams, ApiResponse, ApiError } from './index'

// Generic API endpoint handler type
export type ApiHandler<TRequest = unknown, TResponse = unknown> = (
  request: TRequest
) => Promise<ApiResponse<TResponse>>

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API route configuration
export interface ApiRouteConfig {
  method: HttpMethod
  path: string
  version?: string
  authRequired?: boolean
  rateLimit?: {
    interval: number
    maxRequests: number
  }
}

// Request context (for server actions and API routes)
export interface RequestContext {
  userId?: string
  organizationId?: string
  userAgent?: string
  ip?: string
}

// Standardized query response
export interface QueryResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Bulk operation request
export interface BulkOperationRequest<T = unknown> {
  ids: string[]
  action: string
  data?: T
}

// Bulk operation response
export interface BulkOperationResponse {
  success: number
  failed: number
  errors: Array<{
    id: string
    error: string
  }>
}

