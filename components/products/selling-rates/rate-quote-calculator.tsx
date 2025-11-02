/**
 * Rate Quote Calculator
 * 
 * Simulates a booking/quote flow to test how selling rates work in practice
 * Allows selecting product/option, dates, occupancy, and shows calculated prices
 */

"use client"

import { useState, useMemo } from "react"
import { format, differenceInDays, isWithinInterval, isWeekend, parseISO } from "date-fns"
import type { ProductDetailsResult, SellingRateDetails } from "@/lib/data/products"
import { RATE_BASIS, PRICING_MODEL } from "@/lib/types/selling-rates"
import { isOccupancyBasedPricing } from "@/lib/types/selling-rates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Calculator, Info } from "lucide-react"

type RateQuoteCalculatorProps = {
  product: ProductDetailsResult["product"]
  options: ProductDetailsResult["options"]
}

export function RateQuoteCalculator({ product, options }: RateQuoteCalculatorProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    options.length > 0 ? options[0].id : null
  )
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>({
    from: new Date(),
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  })
  const [occupancy, setOccupancy] = useState<number>(2)
  const [nights, setNights] = useState<number>(1)
  const [itemQuantity, setItemQuantity] = useState<number>(1) // For PER_ITEM basis

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === selectedOptionId) || null
  }, [options, selectedOptionId])

  // Find applicable rates for the booking scenario
  const applicableRates = useMemo(() => {
    if (!selectedOption || !dateRange?.from || !dateRange?.to) return []

    const bookingStart = dateRange.from
    const bookingEnd = dateRange.to
    const bookingNights = nights

    return selectedOption.selling_rates
      .filter((rate) => {
        // Only active rates
        if (!rate.is_active) return false

        // Check if booking dates overlap with rate validity
        const rateStart = parseISO(rate.valid_from)
        const rateEnd = parseISO(rate.valid_to)
        
        // Booking overlaps if: bookingStart <= rateEnd AND bookingEnd >= rateStart
        if (bookingStart > rateEnd || bookingEnd < rateStart) return false

        // Model-specific validation
        switch (rate.pricing_model) {
          case PRICING_MODEL.EXTRA_NIGHT:
            // Check if booking nights match extra night requirements
            const extraNightDetails = rate.pricing_details as any
            if (extraNightDetails?.min_nights && bookingNights < extraNightDetails.min_nights) {
              return false
            }
            if (extraNightDetails?.max_nights && bookingNights > extraNightDetails.max_nights) {
              return false
            }
            break

          case PRICING_MODEL.WEEKEND:
            // Check if any booking date is a weekend
            const hasWeekend = isWeekend(bookingStart) || isWeekend(bookingEnd)
            if (!hasWeekend) {
              // Could still be valid if weekend days are in the range
              const weekendInRange = Array.from(
                { length: differenceInDays(bookingEnd, bookingStart) + 1 },
                (_, i) => {
                  const day = new Date(bookingStart)
                  day.setDate(day.getDate() + i)
                  return day
                }
              ).some((day) => isWeekend(day))
              
              if (!weekendInRange) return false
            }
            break

          case PRICING_MODEL.EARLY_BIRD:
            const earlyBirdDetails = rate.pricing_details as any
            const daysAhead = earlyBirdDetails?.booking_days_ahead || 0
            const daysUntilBooking = differenceInDays(bookingStart, new Date())
            if (daysUntilBooking < daysAhead) return false
            break

          case PRICING_MODEL.LAST_MINUTE:
            const lastMinuteDetails = rate.pricing_details as any
            const daysMax = lastMinuteDetails?.booking_days_max || 0
            const daysUntilBooking2 = differenceInDays(bookingStart, new Date())
            if (daysUntilBooking2 > daysMax) return false
            break

          default:
            // Other models are generally valid if dates match
            break
        }

        return true
      })
      .sort((a, b) => {
        // Sort by specificity (more specific first), then by valid_from (newest first)
        const aSpecificity = getRateSpecificity(a)
        const bSpecificity = getRateSpecificity(b)
        if (aSpecificity !== bSpecificity) {
          return bSpecificity - aSpecificity
        }
        return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      })
  }, [selectedOption, dateRange, nights])

  // Calculate quote for the first applicable rate
  const quote = useMemo(() => {
    if (!selectedOption || !dateRange?.from || !dateRange?.to || applicableRates.length === 0) {
      return null
    }

    const primaryRate = applicableRates[0]
    const bookingStart = dateRange.from
    const bookingEnd = dateRange.to
    const bookingNights = nights

    let basePrice = primaryRate.base_price
    const pricingDetails = primaryRate.pricing_details as any

    // Apply pricing model logic to get unit price
    // NOTE: Unit price depends on BOTH rate basis AND pricing model
    switch (primaryRate.pricing_model) {
      case PRICING_MODEL.OCCUPANCY_BASED:
        // Occupancy-based pricing only works with PER_NIGHT rate basis
        if (primaryRate.rate_basis === RATE_BASIS.PER_NIGHT && isOccupancyBasedPricing(pricingDetails)) {
          if (occupancy === 1 && pricingDetails.single_occupancy_price) {
            basePrice = pricingDetails.single_occupancy_price
          } else if (occupancy === 2 && pricingDetails.double_occupancy_price) {
            basePrice = pricingDetails.double_occupancy_price
          } else if (occupancy === 3 && pricingDetails.triple_occupancy_price) {
            basePrice = pricingDetails.triple_occupancy_price
          } else if (occupancy === 4 && pricingDetails.quadruple_occupancy_price) {
            basePrice = pricingDetails.quadruple_occupancy_price
          } else if (occupancy > (pricingDetails.base_occupancy || 2) && pricingDetails.extra_person_charge) {
            const baseOccupancyPrice = pricingDetails.double_occupancy_price || basePrice
            const extraPeople = occupancy - (pricingDetails.base_occupancy || 2)
            basePrice = baseOccupancyPrice + pricingDetails.extra_person_charge * extraPeople
          } else {
            basePrice = pricingDetails.double_occupancy_price || basePrice
          }
        }
        // If occupancy-based but NOT per_night, just use base_price (not typical but handle gracefully)
        break

      case PRICING_MODEL.WEEKEND:
        const uplift = pricingDetails?.uplift_percentage || 10
        // Check if booking includes weekend days
        const hasWeekend = Array.from(
          { length: bookingNights },
          (_, i) => {
            const day = new Date(bookingStart)
            day.setDate(day.getDate() + i)
            return isWeekend(day)
          }
        ).some((isWeekendDay) => isWeekendDay)
        
        if (hasWeekend) {
          basePrice = basePrice * (1 + uplift / 100)
        }
        break

      case PRICING_MODEL.EARLY_BIRD:
        const discountPct = pricingDetails?.discount_percentage || 0
        const discountAmount = pricingDetails?.discount_amount || 0
        if (discountPct > 0) {
          basePrice = basePrice * (1 - discountPct / 100)
        } else if (discountAmount > 0) {
          basePrice = basePrice - discountAmount
        }
        break

      case PRICING_MODEL.LAST_MINUTE:
        const lastMinDiscountPct = pricingDetails?.discount_percentage || 0
        const lastMinDiscountAmount = pricingDetails?.discount_amount || 0
        if (lastMinDiscountPct > 0) {
          basePrice = basePrice * (1 - lastMinDiscountPct / 100)
        } else if (lastMinDiscountAmount > 0) {
          basePrice = basePrice - lastMinDiscountAmount
        }
        break

      case PRICING_MODEL.PER_PERSON:
        // This pricing model only works with PER_PERSON rate basis
        if (primaryRate.rate_basis === RATE_BASIS.PER_PERSON && Array.isArray(pricingDetails?.pricing_tiers)) {
          const tier = pricingDetails.pricing_tiers.find(
            (t: any) =>
              occupancy >= t.min_pax && (!t.max_pax || occupancy <= t.max_pax)
          )
          if (tier) {
            basePrice = tier.price
          }
        }
        break

      case PRICING_MODEL.EXTRA_NIGHT:
        // Extra night already validated in rate selection
        // base_price is already set correctly
        break

      case PRICING_MODEL.SEASONAL:
      case PRICING_MODEL.STANDARD:
      default:
        // Use base_price as-is
        break
    }

    // Calculate total based on rate basis
    // RATE BASIS is the primary factor - it determines the calculation formula
    // PRICING MODEL only affects the unit price, not the multiplication
    let total = 0
    let quantity = 1
    let quantityLabel = ""
    let unitLabel = "unit"
    
    switch (primaryRate.rate_basis) {
      case RATE_BASIS.PER_NIGHT:
        // Per night: unit price × number of nights
        // Unit price could be affected by occupancy (for occupancy-based), but multiplication is always by nights
        quantity = bookingNights
        quantityLabel = `${bookingNights} night${bookingNights !== 1 ? "s" : ""}`
        unitLabel = "per night"
        total = basePrice * bookingNights
        break

      case RATE_BASIS.PER_PERSON:
        // Per person: ALWAYS multiply by people
        // Then check if pricing model indicates per-night (standard) or one-time (tiered per-person model)
        if (primaryRate.pricing_model === PRICING_MODEL.PER_PERSON) {
          // Tiered per-person pricing model: one-time charge per person (e.g., group tour entrance fee)
          // Rate basis is PER_PERSON, but it's charged once, not per night
          quantity = occupancy
          quantityLabel = `${occupancy} person${occupancy !== 1 ? "s" : ""}`
          unitLabel = "per person (one-time)"
          total = basePrice * occupancy
        } else {
          // Standard per-person: price × people × nights (e.g., per-person-per-night accommodation)
          quantity = occupancy * bookingNights
          quantityLabel = `${occupancy} person${occupancy !== 1 ? "s" : ""} × ${bookingNights} night${bookingNights !== 1 ? "s" : ""}`
          unitLabel = "per person per night"
          total = basePrice * occupancy * bookingNights
        }
        break

      case RATE_BASIS.PER_ITEM:
        // Per item: unit price × number of items
        // For PER_ITEM, the quantity is the number of tickets/items purchased (NOT nights)
        // Example: A "3-day ticket" is 1 item, even if the booking period is 5 days
        quantity = itemQuantity
        quantityLabel = `${itemQuantity} item${itemQuantity !== 1 ? "s" : ""} (ticket${itemQuantity !== 1 ? "s" : ""})`
        unitLabel = "per item"
        total = basePrice * itemQuantity
        break

      case RATE_BASIS.PER_BOOKING:
        // Per booking: one flat price regardless of nights/people
        // This is a fixed price for the entire booking period
        quantity = 1
        quantityLabel = "1 booking"
        unitLabel = "per booking"
        total = basePrice
        // NOTE: Nights and occupancy don't affect per-booking rates
        break

      case RATE_BASIS.FLAT_RATE:
        // Flat rate: one flat price, same as per-booking
        quantity = 1
        quantityLabel = "1 booking"
        unitLabel = "flat rate"
        total = basePrice
        break
    }

    return {
      rate: primaryRate,
      basePrice,
      total,
      currency: primaryRate.currency,
      nights: bookingNights,
      occupancy,
      itemQuantity,
      breakdown: {
        unitPrice: basePrice,
        quantity,
        quantityLabel,
        unitLabel,
        total,
      },
    }
  }, [selectedOption, dateRange, nights, occupancy, itemQuantity, applicableRates])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Quote Calculator
        </CardTitle>
        <CardDescription>
          Test how selling rates calculate prices for bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Product Option</Label>
            <Select
              value={selectedOptionId ?? ""}
              onValueChange={(value) => setSelectedOptionId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.option_name} ({option.option_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Booking Dates</Label>
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range)
                if (range?.from && range?.to) {
                  const days = differenceInDays(range.to, range.from) + 1
                  setNights(days)
                }
              }}
              placeholder="Select check-in and check-out"
            />
          </div>

          {/* Show different inputs based on rate basis */}
          {selectedOption && applicableRates.length > 0 && applicableRates[0]?.rate_basis === RATE_BASIS.PER_ITEM ? (
            <div className="grid gap-2">
              <Label htmlFor="itemQuantity">
                Number of Items/Tickets
                <span className="text-xs text-muted-foreground ml-2">
                  (How many tickets/items for this booking period)
                </span>
              </Label>
              <Input
                id="itemQuantity"
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Booking period: {dateRange?.from && dateRange?.to ? `${differenceInDays(dateRange.to, dateRange.from) + 1} days` : "Select dates"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nights">
                  Number of Nights
                  {selectedOption && applicableRates.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({applicableRates[0]?.rate_basis === RATE_BASIS.PER_BOOKING || applicableRates[0]?.rate_basis === RATE_BASIS.FLAT_RATE ? "not used" : "required"})
                    </span>
                  )}
                </Label>
                <Input
                  id="nights"
                  type="number"
                  min="1"
                  value={nights}
                  onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                  disabled={selectedOption && applicableRates.length > 0 && 
                    (applicableRates[0]?.rate_basis === RATE_BASIS.PER_BOOKING || applicableRates[0]?.rate_basis === RATE_BASIS.FLAT_RATE)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="occupancy">
                  Occupancy / Number of People
                  {selectedOption && applicableRates.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({applicableRates[0]?.rate_basis === RATE_BASIS.PER_BOOKING || applicableRates[0]?.rate_basis === RATE_BASIS.FLAT_RATE || applicableRates[0]?.rate_basis === RATE_BASIS.PER_NIGHT ? "optional" : "required"})
                    </span>
                  )}
                </Label>
                <Input
                  id="occupancy"
                  type="number"
                  min="1"
                  value={occupancy}
                  onChange={(e) => setOccupancy(parseInt(e.target.value) || 1)}
                  disabled={selectedOption && applicableRates.length > 0 && 
                    (applicableRates[0]?.rate_basis === RATE_BASIS.PER_BOOKING || applicableRates[0]?.rate_basis === RATE_BASIS.FLAT_RATE)}
                />
              </div>
            </div>
          )}
          
          {/* Show rate basis information */}
          {selectedOption && applicableRates.length > 0 && (
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Rate Basis: {applicableRates[0].rate_basis.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-200">
                    {applicableRates[0].rate_basis === RATE_BASIS.PER_NIGHT && "Price is multiplied by number of nights."}
                    {applicableRates[0].rate_basis === RATE_BASIS.PER_PERSON && 
                      (applicableRates[0].pricing_model === PRICING_MODEL.PER_PERSON
                        ? "Price is multiplied by number of people (one-time charge)."
                        : "Price is multiplied by number of people × nights.")}
                    {applicableRates[0].rate_basis === RATE_BASIS.PER_ITEM && "Price is multiplied by number of items/tickets. For multi-day tickets, enter the number of tickets (not nights)."}
                    {(applicableRates[0].rate_basis === RATE_BASIS.PER_BOOKING || applicableRates[0].rate_basis === RATE_BASIS.FLAT_RATE) && 
                      "Fixed price for entire booking period. Nights and occupancy do not affect the total."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quote Results */}
        {quote && (
          <>
            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Applicable Rate</h4>
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {quote.rate.rate_name || "Untitled Rate"}
                    </span>
                    <Badge variant="outline" className="uppercase">
                      {quote.rate.rate_basis.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge className="bg-muted text-muted-foreground capitalize">
                      {quote.rate.pricing_model.replace("_", " ")}
                    </Badge>
                    <span>
                      Valid: {format(parseISO(quote.rate.valid_from), "MMM d")} -{" "}
                      {format(parseISO(quote.rate.valid_to), "MMM d")}
                    </span>
                  </div>
                </div>
              </div>

              {applicableRates.length > 1 && (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                        Multiple rates found
                      </p>
                      <p className="text-[11px] text-yellow-800 dark:text-yellow-200 mt-1">
                        {applicableRates.length} rates match your criteria. Using the most specific rate:
                        "{quote.rate.rate_name || quote.rate.rate_basis}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Price Breakdown</h4>
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Unit Price ({quote.breakdown.unitLabel})
                    </span>
                    <span className="font-medium">
                      {quote.currency} {quote.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {quote.breakdown.quantityLabel}
                    </span>
                    <span className="font-medium">
                      × {quote.breakdown.quantity}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Total Price</span>
                    <span className="text-2xl font-bold">
                      {quote.currency} {quote.total.toFixed(2)}
                    </span>
                  </div>

                  {quote.rate.target_cost && (
                    <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Your cost:</span>
                        <span>{quote.currency} {quote.rate.target_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Your profit:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {quote.currency} {(quote.total - quote.rate.target_cost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!quote && dateRange?.from && dateRange?.to && selectedOption && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                  No applicable rates found
                </p>
                <p className="text-[11px] text-yellow-800 dark:text-yellow-200 mt-1">
                  No active rates match your selected dates and criteria. Try different dates or check if rates are active.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper functions

function getRateSpecificity(rate: SellingRateDetails): number {
  let specificity = 0
  
  // More specific models get higher scores
  if (rate.pricing_model === PRICING_MODEL.OCCUPANCY_BASED) specificity += 10
  if (rate.pricing_model === PRICING_MODEL.EARLY_BIRD) specificity += 8
  if (rate.pricing_model === PRICING_MODEL.LAST_MINUTE) specificity += 8
  if (rate.pricing_model === PRICING_MODEL.WEEKEND) specificity += 7
  if (rate.pricing_model === PRICING_MODEL.EXTRA_NIGHT) specificity += 6
  if (rate.pricing_model === PRICING_MODEL.SEASONAL) specificity += 5
  if (rate.pricing_model === PRICING_MODEL.STANDARD) specificity += 1
  
  // Named rates are more specific
  if (rate.rate_name) specificity += 2
  
  return specificity
}

function getQuantityForRateBasis(
  rateBasis: string,
  nights: number,
  occupancy: number
): number {
  switch (rateBasis) {
    case RATE_BASIS.PER_NIGHT:
      return nights
    case RATE_BASIS.PER_PERSON:
      return occupancy * nights
    case RATE_BASIS.PER_ITEM:
      return nights
    case RATE_BASIS.PER_BOOKING:
    case RATE_BASIS.FLAT_RATE:
      return 1
    default:
      return nights
  }
}

function getQuantityLabel(rateBasis: string, nights: number, occupancy: number): string {
  switch (rateBasis) {
    case RATE_BASIS.PER_NIGHT:
      return `Nights (${nights} night${nights !== 1 ? "s" : ""})`
    case RATE_BASIS.PER_PERSON:
      return `People × Nights (${occupancy} × ${nights})`
    case RATE_BASIS.PER_ITEM:
      return `Items (${nights} day${nights !== 1 ? "s" : ""})`
    case RATE_BASIS.PER_BOOKING:
      return "Booking"
    case RATE_BASIS.FLAT_RATE:
      return "Flat Rate"
    default:
      return "Quantity"
  }
}

