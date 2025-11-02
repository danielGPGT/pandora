/**
 * Error message building utilities
 */

/**
 * Build error messages from load errors object
 */
export function buildLoadErrorMessages<T extends Record<string, boolean>>(
  loadErrors: T,
  errorMessages: Partial<Record<keyof T, string>>
): string[] {
  const messages: string[] = []
  
  for (const [key, hasError] of Object.entries(loadErrors)) {
    if (hasError && errorMessages[key as keyof T]) {
      messages.push(errorMessages[key as keyof T]!)
    }
  }
  
  return messages
}

/**
 * Standard error messages for event details
 */
export const EVENT_ERROR_MESSAGES = {
  products: "We couldn't load linked products.",
  contracts: "We couldn't load associated contracts.",
  bookings: "Upcoming booking information may be incomplete.",
  auditLog: "Recent activity timeline is unavailable.",
  counts: "Summary metrics may be out of date.",
} as const

/**
 * Standard error messages for contract details
 */
export const CONTRACT_ERROR_MESSAGES = {
  allocations: "We couldn't load allocation data for this contract right now. Try refreshing or check back later.",
  supplierRates: "Something went wrong while loading supplier rates. The data shown below may be incomplete.",
  bookings: "We couldn't fetch recent booking usage for this contract.",
  auditLog: "We couldn't load the audit trail for this contract. Activity shown below may be incomplete.",
} as const

