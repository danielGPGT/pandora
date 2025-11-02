/**
 * Enterprise-level error handling
 * 
 * Standardized error classes and error handling utilities
 */

import { ERROR_CODES } from '@/lib/constants'

// Base application error
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ERROR_CODES.UNAUTHORIZED, message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ERROR_CODES.FORBIDDEN, message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.DUPLICATE_CODE, message, 409, details)
    this.name = 'ConflictError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.DATABASE_ERROR, message, 500, details)
    this.name = 'DatabaseError'
  }
}

// Error handler utility
export function handleError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error
  }
  
  // If it's a Zod validation error
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> }
    const details: Record<string, string> = {}
    
    zodError.issues.forEach(issue => {
      const path = issue.path.join('.')
      details[path] = issue.message
    })
    
    return new ValidationError('Validation failed', details)
  }
  
  // If it's a standard Error
  if (error instanceof Error) {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, error.message, 500, {
      originalError: error.name,
    })
  }
  
  // Unknown error
  return new AppError(
    ERROR_CODES.INTERNAL_ERROR,
    'An unknown error occurred',
    500
  )
}

// Safe error message extraction (for client-side)
export function getErrorMessage(error: unknown): string {
  const appError = handleError(error)
  return appError.message
}

// Safe error details extraction
export function getErrorDetails(error: unknown): Record<string, unknown> | undefined {
  const appError = handleError(error)
  return appError.details
}

