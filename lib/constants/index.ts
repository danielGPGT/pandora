/**
 * Enterprise-level application constants
 * 
 * Centralized constants for routes, configuration values, and business rules
 */

// Route paths
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  PRODUCTS: '/products',
  EVENTS: '/events',
  SUPPLIERS: '/suppliers',
  CONTRACTS: '/contracts',
  AUDIT_LOGS: '/audit-logs',
  
  // API routes (if using Next.js API routes)
  API: {
    V1: '/api/v1',
  },
} as const

// Application configuration
export const APP_CONFIG = {
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  
  // Search configuration
  MIN_SEARCH_LENGTH: 2,
  SEARCH_DEBOUNCE_MS: 300,
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // Date/time formats
  DATE_FORMAT: 'yyyy-MM-dd',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'MMM dd, yyyy',
  DISPLAY_DATETIME_FORMAT: 'MMM dd, yyyy HH:mm',
  
  // Entity statuses
  DEFAULT_STATUS: 'active',
  STATUS_OPTIONS: ['active', 'inactive', 'archived', 'pending', 'draft'] as const,
} as const

// Business rules constants
export const BUSINESS_RULES = {
  // Code generation
  MIN_CODE_LENGTH: 3,
  MAX_CODE_LENGTH: 50,
  CODE_PATTERN: /^[A-Z0-9_-]+$/,
  
  // Product codes
  PRODUCT_CODE_PREFIX_LENGTH: 3,
  
  // Validation
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  
  // Currency
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'AED', 'SAR'] as const,
} as const

// Cache keys (for React Query, etc.)
export const CACHE_KEYS = {
  PRODUCTS: 'products',
  EVENTS: 'events',
  SUPPLIERS: 'suppliers',
  CONTRACTS: 'contracts',
  USER: 'user',
  ORGANIZATION: 'organization',
  AUDIT_LOGS: 'audit-logs',
} as const

// Error codes (standardized)
export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Not found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Business logic
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Successfully created',
  UPDATED: 'Successfully updated',
  DELETED: 'Successfully deleted',
  SAVED: 'Successfully saved',
  UPLOADED: 'Successfully uploaded',
} as const

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_FAILED: 'Please check your input and try again.',
} as const

