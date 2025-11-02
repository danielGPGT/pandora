/**
 * Status utilities
 * 
 * Functions for formatting and handling status values
 */

import type { StatusVariant } from '@/lib/types/common'

/**
 * Format status label (capitalize words, replace underscores)
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Uncategorised'
  return status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Get status variant for event status
 */
export function getEventStatusVariant(status: string | null | undefined): StatusVariant {
  if (!status) return 'default'
  
  const key = status.toLowerCase()
  switch (key) {
    case 'active':
    case 'live':
    case 'confirmed':
      return 'success'
    case 'scheduled':
      return 'info'
    case 'completed':
      return 'default'
    case 'cancelled':
    case 'canceled':
      return 'destructive'
    default:
      return 'warning'
  }
}

/**
 * Get status variant for contract status
 */
export function getContractStatusVariant(status: string | null | undefined): StatusVariant {
  if (!status) return 'default'
  
  const key = status.toLowerCase()
  switch (key) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'draft':
      return 'default'
    case 'expired':
      return 'info'
    case 'cancelled':
    case 'canceled':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get status variant for supplier status (active/inactive)
 */
export function getSupplierStatusVariant(isActive: boolean | null | undefined): StatusVariant {
  if (isActive === true) return 'success'
  if (isActive === false) return 'warning'
  return 'default'
}

