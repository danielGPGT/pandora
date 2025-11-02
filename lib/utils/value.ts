/**
 * Value formatting utilities
 */

/**
 * Return value or dash if null/undefined/empty
 */
export function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-"
  }
  return String(value)
}

/**
 * Return value or default if null/undefined/empty
 */
export function valueOrDefault<T>(
  value: T | null | undefined,
  defaultValue: T
): T {
  if (value === null || value === undefined || (typeof value === "string" && value === "")) {
    return defaultValue
  }
  return value
}

/**
 * Check if value is empty (null, undefined, or empty string)
 */
export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value === "")
}

