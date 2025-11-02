/**
 * Multi-Rate Calculation Utilities
 * 
 * Handles bookings that span multiple rate periods
 * e.g., Standard rate Dec 4-8, customer wants Dec 4-10
 */

import { parseISO, differenceInDays, isWithinInterval, addDays, startOfDay } from "date-fns"
import type { SellingRateDetails } from "@/lib/data/products"
import { RATE_BASIS, PRICING_MODEL } from "@/lib/types/selling-rates"

export type RatePeriod = {
  rate: SellingRateDetails
  startDate: Date
  endDate: Date
  nights: number
  unitPrice: number
  subtotal: number
}

export type MultiRateBreakdown = {
  periods: RatePeriod[]
  totalNights: number
  totalPrice: number
  currency: string
  hasGaps: boolean
  gapDates: Array<{ from: Date; to: Date }>
  warnings: string[]
}

/**
 * Splits a booking date range into rate periods
 * Finds rates for each night and groups consecutive nights with the same rate
 */
export function calculateMultiRateBreakdown(
  bookingStart: Date,
  bookingEnd: Date,
  availableRates: SellingRateDetails[],
  occupancy: number = 2,
  itemQuantity: number = 1
): MultiRateBreakdown {
  const nights = differenceInDays(bookingEnd, bookingStart) + 1
  const periods: RatePeriod[] = []
  const gapDates: Array<{ from: Date; to: Date }> = []
  const warnings: string[] = []
  
  let currentDate = startOfDay(bookingStart)
  let totalPrice = 0
  let currency = "USD"
  let hasGaps = false

  // Find applicable rate for each night
  const nightlyRates: Array<{ date: Date; rate: SellingRateDetails | null }> = []
  
  for (let i = 0; i < nights; i++) {
    const checkDate = addDays(currentDate, i)
    const applicableRate = findRateForDate(checkDate, availableRates, bookingStart, bookingEnd)
    
    if (!applicableRate) {
      // Gap found - no rate available for this date
      hasGaps = true
      // Find the end of the gap
      let gapEnd = checkDate
      for (let j = i + 1; j < nights; j++) {
        const nextDate = addDays(currentDate, j)
        const nextRate = findRateForDate(nextDate, availableRates, bookingStart, bookingEnd)
        if (nextRate) {
          gapEnd = addDays(nextDate, -1)
          break
        }
        if (j === nights - 1) {
          gapEnd = bookingEnd
        }
      }
      gapDates.push({ from: checkDate, to: gapEnd })
      warnings.push(`No rate available for ${checkDate.toLocaleDateString()} - ${gapEnd.toLocaleDateString()}`)
    }
    
    nightlyRates.push({ date: checkDate, rate: applicableRate })
    if (applicableRate && !currency) {
      currency = applicableRate.currency || "USD"
    }
  }

  // Group consecutive nights with the same rate
  let currentPeriod: RatePeriod | null = null
  
  for (let i = 0; i < nightlyRates.length; i++) {
    const { date, rate } = nightlyRates[i]
    
    if (!rate) {
      // No rate - end current period if exists
      if (currentPeriod) {
        periods.push(currentPeriod)
        currentPeriod = null
      }
      continue
    }

    // Calculate unit price for this rate and date
    const unitPrice = calculateUnitPrice(rate, occupancy, date)
    
    // Check if we can extend current period or start new one
    if (currentPeriod && currentPeriod.rate.id === rate.id && 
        differenceInDays(date, currentPeriod.endDate) === 1) {
      // Extend current period
      currentPeriod.endDate = date
      currentPeriod.nights += 1
      currentPeriod.subtotal = currentPeriod.unitPrice * currentPeriod.nights
      totalPrice += currentPeriod.unitPrice
    } else {
      // Start new period
      if (currentPeriod) {
        periods.push(currentPeriod)
      }
      currentPeriod = {
        rate,
        startDate: date,
        endDate: date,
        nights: 1,
        unitPrice,
        subtotal: unitPrice,
      }
      totalPrice += unitPrice
    }
  }

  // Add final period
  if (currentPeriod) {
    periods.push(currentPeriod)
  }

  // Apply item quantity multiplier if PER_ITEM rate basis
  // Note: PER_ITEM rates are typically one-time, but handle quantity
  if (periods.length > 0 && periods[0].rate.rate_basis === RATE_BASIS.PER_ITEM) {
    totalPrice = totalPrice * itemQuantity
    periods.forEach((p) => {
      p.subtotal = p.subtotal * itemQuantity
    })
  }

  return {
    periods,
    totalNights: nights,
    totalPrice,
    currency,
    hasGaps,
    gapDates,
    warnings,
  }
}

/**
 * Finds the best rate for a specific date
 */
function findRateForDate(
  date: Date,
  availableRates: SellingRateDetails[],
  bookingStart: Date,
  bookingEnd: Date
): SellingRateDetails | null {
  const validRates = availableRates.filter((rate) => {
    if (!rate.is_active) return false
    
    const rateStart = parseISO(rate.valid_from)
    const rateEnd = parseISO(rate.valid_to)
    
    // Check if date falls within rate validity
    return date >= rateStart && date <= rateEnd
  })

  if (validRates.length === 0) return null

  // Prioritize more specific rates
  return validRates.sort((a, b) => {
    // Named rates first
    if (a.rate_name && !b.rate_name) return -1
    if (!a.rate_name && b.rate_name) return 1

    // Occupancy-based is more specific
    if (a.pricing_model === PRICING_MODEL.OCCUPANCY_BASED && 
        b.pricing_model !== PRICING_MODEL.OCCUPANCY_BASED) return -1
    if (a.pricing_model !== PRICING_MODEL.OCCUPANCY_BASED && 
        b.pricing_model === PRICING_MODEL.OCCUPANCY_BASED) return 1

    // Newer rates first
    return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
  })[0]
}

/**
 * Calculates unit price for a rate on a specific date
 * Handles occupancy-based pricing, weekend rates, etc.
 */
function calculateUnitPrice(
  rate: SellingRateDetails,
  occupancy: number,
  date: Date
): number {
  let unitPrice = rate.base_price
  const pricingDetails = rate.pricing_details as any

  // Apply pricing model adjustments
  switch (rate.pricing_model) {
    case PRICING_MODEL.OCCUPANCY_BASED:
      if (rate.rate_basis === RATE_BASIS.PER_NIGHT) {
        if (occupancy === 1 && pricingDetails?.single_occupancy_price) {
          unitPrice = pricingDetails.single_occupancy_price
        } else if (occupancy === 2 && pricingDetails?.double_occupancy_price) {
          unitPrice = pricingDetails.double_occupancy_price
        } else if (occupancy === 3 && pricingDetails?.triple_occupancy_price) {
          unitPrice = pricingDetails.triple_occupancy_price
        } else if (occupancy === 4 && pricingDetails?.quadruple_occupancy_price) {
          unitPrice = pricingDetails.quadruple_occupancy_price
        } else if (pricingDetails?.double_occupancy_price) {
          unitPrice = pricingDetails.double_occupancy_price
        }
      }
      break

    case PRICING_MODEL.WEEKEND:
      // Weekend rates might have different pricing
      // This would check if the date is a weekend
      break

    // Add other pricing models as needed
  }

  return unitPrice
}

/**
 * Validates if a date range can be covered by available rates
 */
export function validateDateRangeCoverage(
  bookingStart: Date,
  bookingEnd: Date,
  availableRates: SellingRateDetails[]
): {
  isValid: boolean
  coverage: number // Percentage of nights covered
  gaps: Array<{ from: Date; to: Date }>
  warnings: string[]
} {
  const nights = differenceInDays(bookingEnd, bookingStart) + 1
  let coveredNights = 0
  const gaps: Array<{ from: Date; to: Date }> = []
  const warnings: string[] = []

  let currentGapStart: Date | null = null

  for (let i = 0; i < nights; i++) {
    const checkDate = addDays(bookingStart, i)
    const hasRate = findRateForDate(checkDate, availableRates, bookingStart, bookingEnd) !== null

    if (hasRate) {
      coveredNights++
      if (currentGapStart) {
        // End of gap
        gaps.push({ from: currentGapStart, to: addDays(checkDate, -1) })
        currentGapStart = null
      }
    } else {
      if (!currentGapStart) {
        currentGapStart = checkDate
      }
    }
  }

  // Handle gap at the end
  if (currentGapStart) {
    gaps.push({ from: currentGapStart, to: bookingEnd })
  }

  const coverage = (coveredNights / nights) * 100

  if (gaps.length > 0) {
    warnings.push(
      `${gaps.length} gap${gaps.length > 1 ? "s" : ""} found: ${gaps.map((g) => 
        `${g.from.toLocaleDateString()}-${g.to.toLocaleDateString()}`
      ).join(", ")}`
    )
  }

  return {
    isValid: coverage === 100,
    coverage,
    gaps,
    warnings,
  }
}

