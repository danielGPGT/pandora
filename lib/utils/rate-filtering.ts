/**
 * Utilities for filtering selling rates based on dates and availability
 */

import { parseISO, isWithinInterval } from "date-fns"
import type { SellingRateDetails } from "@/lib/data/products"
import { PRICING_MODEL } from "@/lib/types/selling-rates"

/**
 * Filters rates that are valid for the given date range
 */
export function filterRatesByDateRange(
  rates: SellingRateDetails[],
  bookingStart: Date,
  bookingEnd: Date
): SellingRateDetails[] {
  return rates.filter((rate) => {
    // Only active rates
    if (!rate.is_active) return false

    const rateStart = parseISO(rate.valid_from)
    const rateEnd = parseISO(rate.valid_to)

    // Check if booking dates overlap with rate validity
    // Booking overlaps if: bookingStart <= rateEnd AND bookingEnd >= rateStart
    if (bookingStart > rateEnd || bookingEnd < rateStart) return false

    return true
  })
}

/**
 * Finds the best/most applicable rate for a given date range
 * Prioritizes more specific rates (named rates, occupancy-based, etc.)
 */
export function findBestRate(
  rates: SellingRateDetails[],
  bookingStart: Date,
  bookingEnd: Date,
  occupancy?: number
): SellingRateDetails | null {
  const validRates = filterRatesByDateRange(rates, bookingStart, bookingEnd)

  if (validRates.length === 0) return null

  // Sort by specificity
  const sorted = validRates.sort((a, b) => {
    // Named rates are more specific
    if (a.rate_name && !b.rate_name) return -1
    if (!a.rate_name && b.rate_name) return 1

    // Occupancy-based is very specific
    if (a.pricing_model === PRICING_MODEL.OCCUPANCY_BASED && b.pricing_model !== PRICING_MODEL.OCCUPANCY_BASED) {
      return -1
    }
    if (a.pricing_model !== PRICING_MODEL.OCCUPANCY_BASED && b.pricing_model === PRICING_MODEL.OCCUPANCY_BASED) {
      return 1
    }

    // Newer rates first
    return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
  })

  return sorted[0]
}

/**
 * Gets all applicable rates for a date range (for selection)
 */
export function getApplicableRates(
  rates: SellingRateDetails[],
  bookingStart: Date,
  bookingEnd: Date
): SellingRateDetails[] {
  const validRates = filterRatesByDateRange(rates, bookingStart, bookingEnd)
  
  // Sort by specificity then date
  return validRates.sort((a, b) => {
    // Named rates first
    if (a.rate_name && !b.rate_name) return -1
    if (!a.rate_name && b.rate_name) return 1

    // Then by pricing model specificity
    const modelPriority: Record<string, number> = {
      [PRICING_MODEL.OCCUPANCY_BASED]: 10,
      [PRICING_MODEL.EARLY_BIRD]: 8,
      [PRICING_MODEL.LAST_MINUTE]: 8,
      [PRICING_MODEL.WEEKEND]: 7,
      [PRICING_MODEL.EXTRA_NIGHT]: 6,
      [PRICING_MODEL.SEASONAL]: 5,
      [PRICING_MODEL.STANDARD]: 1,
    }

    const aPriority = modelPriority[a.pricing_model] || 0
    const bPriority = modelPriority[b.pricing_model] || 0

    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }

    // Then by newest first
    return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
  })
}

