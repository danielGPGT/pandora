/**
 * Date range utilities
 * 
 * Functions for formatting date ranges and relative times
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { formatDate } from './date'

export interface DateRange {
  from: Date | string | null
  to: Date | string | null
}

/**
 * Format a date range for display
 */
export function formatDateRange(
  from: Date | string | null | undefined,
  to?: Date | string | null | undefined
): string {
  if (!from) return 'No start date'
  
  try {
    const fromDate = typeof from === 'string' ? parseISO(from) : from
    if (!isValid(fromDate)) return 'Invalid date'
    
    // If no 'to' date or same date, return single date
    if (!to) {
      return format(fromDate, 'MMM dd, yyyy')
    }
    
    const toDate = typeof to === 'string' ? parseISO(to) : to
    if (!isValid(toDate)) {
      return format(fromDate, 'MMM dd, yyyy')
    }
    
    if (fromDate.getTime() === toDate.getTime()) {
      return format(fromDate, 'MMM dd, yyyy')
    }
    
    return `${format(fromDate, 'MMM dd, yyyy')} — ${format(toDate, 'MMM dd, yyyy')}`
  } catch {
    return 'Invalid date range'
  }
}

/**
 * Format date range from event object
 */
export function formatEventDateRange(event: {
  event_date_from: string | null
  event_date_to?: string | null
}): string {
  return formatDateRange(event.event_date_from, event.event_date_to ?? null)
}

/**
 * Get countdown/relative time for event
 */
export function getEventCountdown(event: {
  event_date_from: string
  event_date_to?: string | null
}): string | null {
  try {
    const now = Date.now()
    const from = parseISO(event.event_date_from).getTime()
    const to = event.event_date_to ? parseISO(event.event_date_to).getTime() : null
    
    if (Number.isNaN(from) || (to !== null && Number.isNaN(to))) {
      return null
    }
    
    if (from > now) {
      return `Starts ${formatDistanceToNow(new Date(from), { addSuffix: true })}`
    }
    
    if (to !== null && to > now) {
      return `Ends ${formatDistanceToNow(new Date(to), { addSuffix: true })}`
    }
    
    if (to !== null) {
      return `Ended ${formatDistanceToNow(new Date(to), { addSuffix: true })}`
    }
    
    return null
  } catch {
    return null
  }
}

