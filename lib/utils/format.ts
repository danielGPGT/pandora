/**
 * Formatting utilities
 */

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined = 'USD',
  locale: string = 'en-US',
  options?: { maximumFractionDigits?: number }
): string {
  if (amount === null || amount === undefined) return '-'
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

/**
 * Format number with thousand separators
 */
export function formatNumber(
  value: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Format status label (capitalize words)
 */
export function formatStatusLabel(status: string | null): string {
  if (!status) return ''
  return status.replace(/\b\w/g, (char) => char.toUpperCase())
}

