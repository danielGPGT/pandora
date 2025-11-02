/**
 * Array utilities
 */

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

/**
 * Group array by key
 */
export function groupBy<T>(
  array: T[],
  key: keyof T | ((item: T) => string)
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Sort array by key
 */
export function sortBy<T>(
  array: T[],
  key: keyof T | ((item: T) => number | string),
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...array].sort((a, b) => {
    const aValue = typeof key === 'function' ? key(a) : a[key]
    const bValue = typeof key === 'function' ? key(b) : b[key]
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })
  
  return sorted
}

/**
 * Partition array into two based on predicate
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  
  for (const item of array) {
    if (predicate(item)) {
      pass.push(item)
    } else {
      fail.push(item)
    }
  }
  
  return [pass, fail]
}

