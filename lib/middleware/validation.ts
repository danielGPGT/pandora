/**
 * Validation middleware utilities
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors'

/**
 * Validate request data with Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const details: Record<string, string> = {}
    result.error.issues.forEach(issue => {
      const path = issue.path.join('.')
      details[path] = issue.message
    })
    
    throw new ValidationError('Validation failed', details)
  }
  
  return result.data
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, unknown>
): T {
  // Convert string values to appropriate types
  const processed: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }
    
    // Try to parse as number
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      processed[key] = Number(value)
    } else if (typeof value === 'string' && /^(true|false)$/i.test(value)) {
      processed[key] = value.toLowerCase() === 'true'
    } else {
      processed[key] = value
    }
  }
  
  return validate(schema, processed)
}

