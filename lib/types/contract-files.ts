/**
 * Contract files type definitions
 */

export interface ContractFile {
  id?: string
  name?: string
  filename?: string
  url?: string
  size?: number
  mimeType?: string
  uploadedAt?: string
}

/**
 * Type guard for contract file
 */
export function isContractFile(value: unknown): value is ContractFile {
  if (!value || typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  return (
    (obj.id === undefined || typeof obj.id === 'string') &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.filename === undefined || typeof obj.filename === 'string') &&
    (obj.url === undefined || typeof obj.url === 'string')
  )
}

