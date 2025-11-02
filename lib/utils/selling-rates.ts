/**
 * Selling Rates Utilities
 * 
 * Provides conflict detection, validation, and helper functions for selling rates
 */

import type { SellingRateDetails } from "@/lib/data/products"

export interface RateConflict {
  rateId: string
  rateName: string | null
  conflictType: "overlap" | "exact"
  overlappingDates: {
    from: string
    to: string
  }
}

/**
 * Check if two date ranges overlap
 */
function datesOverlap(
  from1: string | Date,
  to1: string | Date,
  from2: string | Date,
  to2: string | Date
): boolean {
  const d1From = typeof from1 === "string" ? new Date(from1) : from1
  const d1To = typeof to1 === "string" ? new Date(to1) : to1
  const d2From = typeof from2 === "string" ? new Date(from2) : from2
  const d2To = typeof to2 === "string" ? new Date(to2) : to2

  // Check if ranges overlap: start1 <= end2 && start2 <= end1
  return d1From <= d2To && d2From <= d1To
}

/**
 * Detect conflicts between a new/updated rate and existing rates
 * 
 * Two rates conflict if:
 * - Same product_option_id (or both null for product-level rates)
 * - Overlapping valid_from/valid_to dates
 * - Both are active (or checking against active rates)
 */
export function detectRateConflicts(
  newRate: {
    id?: string // If updating, exclude this rate from conflict check
    product_option_id: string | null
    valid_from: string | Date
    valid_to: string | Date
    is_active?: boolean
  },
  existingRates: SellingRateDetails[]
): RateConflict[] {
  const conflicts: RateConflict[] = []

  for (const existing of existingRates) {
    // Skip self if updating
    if (newRate.id && existing.id === newRate.id) {
      continue
    }

    // Only check conflicts with same product_option_id
    if (existing.option_id !== newRate.product_option_id) {
      continue
    }

    // Check for date overlap
    const overlaps = datesOverlap(
      newRate.valid_from,
      newRate.valid_to,
      existing.valid_from,
      existing.valid_to
    )

    if (overlaps) {
      // Check if exact match (same dates)
      const isExact =
        newRate.valid_from.toString() === existing.valid_from &&
        newRate.valid_to.toString() === existing.valid_to

      // Determine overlapping date range
      const from1 = typeof newRate.valid_from === "string" ? new Date(newRate.valid_from) : newRate.valid_from
      const to1 = typeof newRate.valid_to === "string" ? new Date(newRate.valid_to) : newRate.valid_to
      const from2 = new Date(existing.valid_from)
      const to2 = new Date(existing.valid_to)

      const overlapFrom = from1 > from2 ? from1 : from2
      const overlapTo = to1 < to2 ? to1 : to2

      conflicts.push({
        rateId: existing.id,
        rateName: existing.rate_name,
        conflictType: isExact ? "exact" : "overlap",
        overlappingDates: {
          from: overlapFrom.toISOString().split("T")[0],
          to: overlapTo.toISOString().split("T")[0],
        },
      })
    }
  }

  return conflicts
}

/**
 * Format conflict message for display
 */
export function formatConflictMessage(conflicts: RateConflict[]): string {
  if (conflicts.length === 0) return ""

  if (conflicts.length === 1) {
    const conflict = conflicts[0]
    const rateName = conflict.rateName || "Untitled rate"
    if (conflict.conflictType === "exact") {
      return `Conflicts with "${rateName}" (same dates: ${conflict.overlappingDates.from} to ${conflict.overlappingDates.to})`
    }
    return `Overlaps with "${rateName}" (${conflict.overlappingDates.from} to ${conflict.overlappingDates.to})`
  }

  return `${conflicts.length} conflicting rates detected`
}

/**
 * Get date range from rates for calendar view
 */
export function getRatesDateRange(rates: SellingRateDetails[]): {
  minDate: Date | null
  maxDate: Date | null
} {
  if (rates.length === 0) {
    return { minDate: null, maxDate: null }
  }

  const dates = rates.flatMap((rate) => [
    new Date(rate.valid_from),
    new Date(rate.valid_to),
  ])

  return {
    minDate: new Date(Math.min(...dates.map((d) => d.getTime()))),
    maxDate: new Date(Math.max(...dates.map((d) => d.getTime()))),
  }
}

