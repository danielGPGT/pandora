/**
 * Validation utilities
 */

import { BUSINESS_RULES } from '@/lib/constants'

/**
 * Validate product/supplier code format
 */
export function isValidCode(code: string): boolean {
  if (code.length < BUSINESS_RULES.MIN_CODE_LENGTH || 
      code.length > BUSINESS_RULES.MAX_CODE_LENGTH) {
    return false
  }
  return BUSINESS_RULES.CODE_PATTERN.test(code)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize code (remove invalid characters)
 */
export function sanitizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, BUSINESS_RULES.MAX_CODE_LENGTH)
}

/**
 * Generate unique code from name
 */
export function generateCodeFromName(name: string, maxLength: number = 20): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, maxLength)
}

