/**
 * Enterprise-level quote validation utilities
 * Handles complex business rules for quote building
 */

import { parseISO, differenceInDays, isWithinInterval, isAfter, isBefore, addDays } from "date-fns"
import type { SellingRateDetails } from "@/lib/data/products"
import { PRICING_MODEL } from "@/lib/types/selling-rates"

export type QuoteValidationError = {
  type: "error" | "warning"
  code: string
  message: string
  itemId?: string
  field?: string
}

export type QuoteValidationResult = {
  isValid: boolean
  errors: QuoteValidationError[]
  warnings: QuoteValidationError[]
}

/**
 * Validates a single quote item
 */
export function validateQuoteItem(item: {
  id?: string
  rate: SellingRateDetails | null
  dateRange: { from: Date; to?: Date } | undefined
  nights: number
  occupancy: number
  itemQuantity: number
  rateId?: string | null
}): QuoteValidationResult {
  const errors: QuoteValidationError[] = []
  const warnings: QuoteValidationError[] = []

  // Rate validation
  if (!item.rate) {
    errors.push({
      type: "error",
      code: "NO_RATE",
      message: "A valid rate must be selected",
    })
    return { isValid: false, errors, warnings }
  }

  // Date range validation
  if (!item.dateRange?.from || !item.dateRange?.to) {
    errors.push({
      type: "error",
      code: "INVALID_DATES",
      message: "Valid booking dates must be selected",
    })
    return { isValid: false, errors, warnings }
  }

  const bookingStart = item.dateRange.from
  const bookingEnd = item.dateRange.to

  // Check if booking dates are in the past
  if (isBefore(bookingStart, new Date())) {
    errors.push({
      type: "error",
      code: "PAST_DATES",
      message: "Booking dates cannot be in the past",
    })
  }

  // Check if rate is valid for selected dates
  const rateStart = parseISO(item.rate.valid_from)
  const rateEnd = parseISO(item.rate.valid_to)

  // For PER_NIGHT rates, allow partial overlap (warn if dates extend beyond rate)
  // Other rate types must be fully within the rate validity period
  if (item.rate.rate_basis === "per_night") {
    // PER_NIGHT rates can span multiple rate periods - just warn if extending beyond
    if (bookingEnd > rateEnd) {
      warnings.push({
        type: "warning",
        code: "RATE_EXTENDS_BEYOND",
        message: `Booking extends beyond rate validity. Nights after ${rateEnd.toLocaleDateString()} will use available continuation rates or show as gaps.`,
      })
    }
    if (bookingStart < rateStart) {
      warnings.push({
        type: "warning",
        code: "RATE_STARTS_BEFORE",
        message: `Booking starts before rate validity. Nights before ${rateStart.toLocaleDateString()} will need a different rate.`,
      })
    }
  } else {
    // PER_BOOKING, FLAT_RATE, etc. must be fully within rate validity
    if (bookingStart > rateEnd || bookingEnd < rateStart) {
      errors.push({
        type: "error",
        code: "RATE_DATE_MISMATCH",
        message: `Selected rate is only valid from ${rateStart.toLocaleDateString()} to ${rateEnd.toLocaleDateString()}`,
      })
    } else if (bookingStart < rateStart || bookingEnd > rateEnd) {
      warnings.push({
        type: "warning",
        code: "RATE_PARTIAL_COVERAGE",
        message: `Booking dates extend beyond rate validity period.`,
      })
    }
  }

  // Check minimum advance booking (if applicable)
  const daysUntilBooking = differenceInDays(bookingStart, new Date())
  if (item.rate.pricing_model === PRICING_MODEL.EARLY_BIRD) {
    const earlyBirdDetails = item.rate.pricing_details as any
    const minDaysAhead = earlyBirdDetails?.booking_days_ahead || 0
    if (daysUntilBooking < minDaysAhead) {
      warnings.push({
        type: "warning",
        code: "EARLY_BIRD_NOT_MET",
        message: `Early bird rate requires booking at least ${minDaysAhead} days in advance`,
      })
    }
  }

  if (item.rate.pricing_model === PRICING_MODEL.LAST_MINUTE) {
    const lastMinuteDetails = item.rate.pricing_details as any
    const maxDays = lastMinuteDetails?.booking_days_max || 0
    if (daysUntilBooking > maxDays) {
      warnings.push({
        type: "warning",
        code: "LAST_MINUTE_EXPIRED",
        message: `Last minute rate only valid for bookings within ${maxDays} days`,
      })
    }
  }

  // Night validation for per-night rates
  if (item.rate.rate_basis === "per_night") {
    const bookingNights = differenceInDays(bookingEnd, bookingStart) + 1
    
    // Check extra night requirements
    if (item.rate.pricing_model === PRICING_MODEL.EXTRA_NIGHT) {
      const extraNightDetails = item.rate.pricing_details as any
      if (extraNightDetails?.min_nights && bookingNights < extraNightDetails.min_nights) {
        errors.push({
          type: "error",
          code: "MIN_NIGHTS_NOT_MET",
          message: `This rate requires a minimum of ${extraNightDetails.min_nights} nights`,
        })
      }
      if (extraNightDetails?.max_nights && bookingNights > extraNightDetails.max_nights) {
        errors.push({
          type: "error",
          code: "MAX_NIGHTS_EXCEEDED",
          message: `This rate allows a maximum of ${extraNightDetails.max_nights} nights`,
        })
      }
    }

    if (bookingNights !== item.nights && item.nights > 0) {
      warnings.push({
        type: "warning",
        code: "NIGHTS_MISMATCH",
        message: `Date range indicates ${bookingNights} nights but ${item.nights} is specified`,
      })
    }
  }

  // Occupancy validation
  if (item.rate.rate_basis === "per_person" || item.rate.pricing_model === PRICING_MODEL.OCCUPANCY_BASED) {
    if (item.occupancy < 1) {
      errors.push({
        type: "error",
        code: "INVALID_OCCUPANCY",
        message: "Occupancy must be at least 1",
      })
    }

    // Check occupancy limits if defined in product attributes
    // This would need product option attributes passed in
  }

  // Item quantity validation
  if (item.rate.rate_basis === "per_item") {
    if (item.itemQuantity < 1) {
      errors.push({
        type: "error",
        code: "INVALID_QUANTITY",
        message: "Item quantity must be at least 1",
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates multiple quote items for conflicts and consistency
 */
export function validateQuoteItems(items: Array<{
  id: string
  productId: string
  optionId: string
  rate: SellingRateDetails | null
  dateRange: { from: Date; to?: Date } | undefined
  nights: number
  occupancy: number
  itemQuantity: number
  currency: string
}>): QuoteValidationResult {
  const errors: QuoteValidationError[] = []
  const warnings: QuoteValidationError[] = []

  // Validate each item individually
  items.forEach((item) => {
    const itemValidation = validateQuoteItem(item)
    errors.push(
      ...itemValidation.errors.map((e) => ({ ...e, itemId: item.id }))
    )
    warnings.push(
      ...itemValidation.warnings.map((w) => ({ ...w, itemId: item.id }))
    )
  })

  // Check for date conflicts across items
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i]
      const item2 = items[j]

      // Skip if either doesn't have dates
      if (!item1.dateRange?.from || !item1.dateRange?.to || !item2.dateRange?.from || !item2.dateRange?.to) {
        continue
      }

      // Check for overlapping dates on same product (potential conflict)
      if (item1.productId === item2.productId) {
        const overlap = isDateRangeOverlapping(
          { from: item1.dateRange.from, to: item1.dateRange.to },
          { from: item2.dateRange.from, to: item2.dateRange.to }
        )
        
        if (overlap) {
          warnings.push({
            type: "warning",
            code: "SAME_PRODUCT_OVERLAP",
            message: `Multiple items for the same product have overlapping dates`,
            itemId: item1.id,
          })
        }
      }
    }
  }

  // Check currency consistency
  const currencies = new Set(items.map((item) => item.currency))
  if (currencies.size > 1) {
    warnings.push({
      type: "warning",
      code: "MULTIPLE_CURRENCIES",
      message: `Quote contains ${currencies.size} different currencies: ${Array.from(currencies).join(", ")}`,
    })
  }

  // Check for minimum booking value (if required)
  // This would be a business rule from settings

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Checks if two date ranges overlap
 */
function isDateRangeOverlapping(
  range1: { from: Date; to: Date },
  range2: { from: Date; to: Date }
): boolean {
  return range1.from <= range2.to && range1.to >= range2.from
}

/**
 * Validates business rules for quote creation
 */
export function validateBusinessRules(quote: {
  items: Array<{
    calculatedPrice: number
    currency: string
    rate: SellingRateDetails | null
  }>
  totalAmount?: number
  currency?: string
}): QuoteValidationResult {
  const errors: QuoteValidationError[] = []
  const warnings: QuoteValidationError[] = []

  // Minimum quote value
  const totalAmount = quote.items.reduce((sum, item) => sum + item.calculatedPrice, 0)
  const MIN_QUOTE_VALUE = 0 // Could come from settings
  if (totalAmount < MIN_QUOTE_VALUE && MIN_QUOTE_VALUE > 0) {
    warnings.push({
      type: "warning",
      code: "LOW_QUOTE_VALUE",
      message: `Quote value is below recommended minimum`,
    })
  }

  // Maximum quote value (for approval workflows)
  const MAX_QUOTE_VALUE = Infinity // Could come from settings
  if (totalAmount > MAX_QUOTE_VALUE && MAX_QUOTE_VALUE < Infinity) {
    warnings.push({
      type: "warning",
      code: "HIGH_QUOTE_VALUE",
      message: `Quote value exceeds ${MAX_QUOTE_VALUE} and may require approval`,
    })
  }

  // Check for items with no rates selected
  const itemsWithoutRates = quote.items.filter((item) => !item.rate)
  if (itemsWithoutRates.length > 0) {
    errors.push({
      type: "error",
      code: "ITEMS_WITHOUT_RATES",
      message: `${itemsWithoutRates.length} item(s) do not have rates selected`,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

