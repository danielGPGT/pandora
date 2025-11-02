/**
 * Date utilities
 */

import { format, formatDistanceToNow, isValid, parseISO, startOfDay, endOfDay } from 'date-fns'
import { APP_CONFIG } from '@/lib/constants'

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatString: string = APP_CONFIG.DISPLAY_DATE_FORMAT
): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return '-'
    
    return format(dateObj, formatString)
  } catch {
    return '-'
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  formatString: string = APP_CONFIG.DISPLAY_DATETIME_FORMAT
): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, formatString)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return ''
  
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return startOfDay(dateObj)
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return endOfDay(dateObj)
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj < new Date()
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj > new Date()
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const today = new Date()
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  )
}

