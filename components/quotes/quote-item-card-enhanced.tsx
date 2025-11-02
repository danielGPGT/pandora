/**
 * Enhanced Quote Item Card
 * 
 * Detailed item configuration with enterprise-level validation and pricing breakdown
 */

"use client"

import { useState, useEffect } from "react"
import { format, parseISO, differenceInDays } from "date-fns"
import { Trash2, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { RATE_BASIS, PRICING_MODEL } from "@/lib/types/selling-rates"
import type { QuoteItem } from "@/lib/types/quotes"
import type { ProductDetailsResult, SellingRateDetails } from "@/lib/data/products"
import { fetchProductDetailsForQuote } from "@/lib/actions/quotes"
import { getApplicableRates, findBestRate } from "@/lib/utils/rate-filtering"
import { validateQuoteItem } from "@/lib/utils/quote-validation"
import { calculateItemPriceBreakdown } from "@/lib/utils/quote-calculations"
import { validateDateRangeCoverage } from "@/lib/utils/multi-rate-calculation"

type QuoteItemCardEnhancedProps = {
  item: QuoteItem
  onUpdate: (updates: Partial<QuoteItem>) => void
  onRemove: () => void
  productDetails: ProductDetailsResult | null
}

export function QuoteItemCardEnhanced({
  item,
  onUpdate,
  onRemove,
  productDetails,
}: QuoteItemCardEnhancedProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [availableOptions, setAvailableOptions] = useState<any[]>([])
  const [availableRates, setAvailableRates] = useState<SellingRateDetails[]>([])
  const [validationResult, setValidationResult] = useState(validateQuoteItem(item))

  // Load product details when expanded
  const loadProductDetails = async () => {
    const loadRates = (options: any[], optionId: string) => {
      const option = options.find((opt) => opt.id === optionId)
      if (!option) return []

      if (item.dateRange?.from && item.dateRange?.to) {
        return getApplicableRates(
          option.selling_rates || [],
          item.dateRange.from,
          item.dateRange.to
        )
      }
      
      return (option.selling_rates || []).filter((r: SellingRateDetails) => r.is_active)
    }

    if (productDetails) {
      setAvailableOptions(productDetails.options || [])
      setAvailableRates(loadRates(productDetails.options || [], item.optionId))
      return
    }

    try {
      const details = await fetchProductDetailsForQuote(item.productId)
      if (details) {
        setAvailableOptions(details.options || [])
        setAvailableRates(loadRates(details.options || [], item.optionId))
      }
    } catch (error) {
      console.error("Error loading product details:", error)
    }
  }

  // Revalidate when item changes
  useEffect(() => {
    setValidationResult(validateQuoteItem(item))
  }, [item])

  // Load details when expanded
  useEffect(() => {
    if (showDetails) {
      loadProductDetails()
    }
  }, [showDetails, item.dateRange])

  const hasErrors = validationResult.errors.length > 0
  const hasWarnings = validationResult.warnings.length > 0

  return (
    <div className={cn(
      "rounded-lg border bg-card",
      hasErrors && "border-destructive",
      hasWarnings && !hasErrors && "border-yellow-500/50"
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium truncate">{item.productName}</div>
              {hasErrors && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
              {!hasErrors && hasWarnings && <Info className="h-4 w-4 text-yellow-600 flex-shrink-0" />}
              {!hasErrors && !hasWarnings && item.rate && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
            </div>
            <div className="text-sm text-muted-foreground truncate mt-1">
              {item.productCode} · {item.optionName} ({item.optionCode})
            </div>
            {item.rate && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs uppercase">
                  {item.rate.rate_basis.replace("_", " ")}
                </Badge>
                <Badge className="bg-muted text-muted-foreground text-xs capitalize">
                  {item.rate.pricing_model.replace("_", " ")}
                </Badge>
                <span className="text-xs font-semibold">
                  {item.currency} {(item.finalPrice || item.calculatedPrice || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-8"
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive h-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Validation Messages */}
        {hasErrors && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">Validation Errors</AlertTitle>
            <AlertDescription className="text-xs">
              {validationResult.errors.map((e, idx) => (
                <div key={idx}>{e.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
        {!hasErrors && hasWarnings && (
          <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-xs text-yellow-900 dark:text-yellow-100">Warnings</AlertTitle>
            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
              {validationResult.warnings.map((w, idx) => (
                <div key={idx}>{w.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Expanded Details */}
        {showDetails && (
          <div className="space-y-4 pt-3 border-t">
            {/* Option Selector */}
            {availableOptions.length > 1 && (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Product Option</Label>
                <Select
                  value={item.optionId}
                  onValueChange={(optionId) => {
                    const option = availableOptions.find((opt) => opt.id === optionId)
                    if (option) {
                      const firstRate = option.selling_rates.find((r) => r.is_active) || null
                      onUpdate({
                        optionId: option.id,
                        optionName: option.option_name,
                        optionCode: option.option_code,
                        rate: firstRate,
                        rateId: firstRate?.id || null,
                        currency: firstRate?.currency || item.currency,
                        cost: firstRate?.target_cost || undefined,
                      })
                      const optionRates = getApplicableRates(
                        option.selling_rates || [],
                        item.dateRange?.from || new Date(),
                        item.dateRange?.to || new Date()
                      )
                      setAvailableRates(optionRates)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.option_name} ({opt.option_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rate Selector */}
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Selling Rate</Label>
              {availableRates.length === 0 ? (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3">
                  <p className="text-xs text-yellow-900 dark:text-yellow-100">
                    {!item.dateRange?.from || !item.dateRange?.to
                      ? "Select dates above to see available rates"
                      : "No active rates available for the selected dates"}
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={item.rateId || item.rate?.id || ""}
                    onValueChange={(rateId) => {
                      const rate = availableRates.find((r) => r.id === rateId) || null
                      onUpdate({
                        rate,
                        rateId: rate?.id || null,
                        currency: rate?.currency || item.currency,
                        cost: rate?.target_cost || undefined,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          <div className="flex flex-col">
                            <span>{rate.rate_name || rate.rate_basis}</span>
                            <span className="text-xs text-muted-foreground">
                              {rate.currency} {rate.base_price.toFixed(2)} · Valid: {format(parseISO(rate.valid_from), "MMM d")} - {format(parseISO(rate.valid_to), "MMM d")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {availableRates.length} rate{availableRates.length !== 1 ? "s" : ""} available
                  </p>
                </>
              )}
            </div>

            {/* Date Range */}
            {item.rate?.rate_basis !== RATE_BASIS.PER_BOOKING && 
             item.rate?.rate_basis !== RATE_BASIS.FLAT_RATE && (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Booking Dates</Label>
                <DateRangePicker
                  value={item.dateRange}
                  onChange={(range) => {
                    onUpdate({ dateRange: range })
                    if (range?.from && range?.to) {
                      const nights = differenceInDays(new Date(range.to), new Date(range.from)) + 1
                      onUpdate({ nights })
                      setTimeout(() => loadProductDetails(), 100)
                    }
                  }}
                />
                {item.dateRange?.from && item.dateRange?.to && (
                  <p className="text-xs text-muted-foreground">
                    {differenceInDays(new Date(item.dateRange.to), new Date(item.dateRange.from)) + 1} days selected
                  </p>
                )}
              </div>
            )}

            {/* Nights (if applicable) */}
            {item.rate?.rate_basis === RATE_BASIS.PER_NIGHT && (
              <div className="grid gap-2">
                <Label htmlFor={`nights-${item.id}`} className="text-sm font-medium">
                  Number of Nights
                </Label>
                <Input
                  id={`nights-${item.id}`}
                  type="number"
                  min="1"
                  value={item.nights}
                  onChange={(e) => onUpdate({ nights: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Occupancy (if applicable) */}
            {(item.rate?.rate_basis === RATE_BASIS.PER_PERSON || 
              item.rate?.pricing_model === PRICING_MODEL.OCCUPANCY_BASED) && (
              <div className="grid gap-2 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor={`adults-${item.id}`} className="text-sm font-medium">
                    Adults
                  </Label>
                  <Input
                    id={`adults-${item.id}`}
                    type="number"
                    min="0"
                    value={item.adults || item.occupancy}
                    onChange={(e) => {
                      const adults = parseInt(e.target.value) || 0
                      onUpdate({ 
                        adults,
                        occupancy: adults + (item.children || 0) + (item.infants || 0) || adults
                      })
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`children-${item.id}`} className="text-sm font-medium">
                    Children
                  </Label>
                  <Input
                    id={`children-${item.id}`}
                    type="number"
                    min="0"
                    value={item.children || 0}
                    onChange={(e) => {
                      const children = parseInt(e.target.value) || 0
                      onUpdate({ 
                        children,
                        occupancy: (item.adults || item.occupancy) + children + (item.infants || 0)
                      })
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`infants-${item.id}`} className="text-sm font-medium">
                    Infants
                  </Label>
                  <Input
                    id={`infants-${item.id}`}
                    type="number"
                    min="0"
                    value={item.infants || 0}
                    onChange={(e) => {
                      const infants = parseInt(e.target.value) || 0
                      onUpdate({ 
                        infants,
                        occupancy: (item.adults || item.occupancy) + (item.children || 0) + infants
                      })
                    }}
                  />
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor={`occupancy-${item.id}`} className="text-sm font-medium">
                    Total Occupancy
                  </Label>
                  <Input
                    id={`occupancy-${item.id}`}
                    type="number"
                    min="1"
                    value={item.occupancy}
                    onChange={(e) => onUpdate({ occupancy: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}

            {/* Item Quantity (for PER_ITEM) */}
            {item.rate?.rate_basis === RATE_BASIS.PER_ITEM && (
              <div className="grid gap-2">
                <Label htmlFor={`quantity-${item.id}`} className="text-sm font-medium">
                  Number of Items/Tickets
                </Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  min="1"
                  value={item.itemQuantity}
                  onChange={(e) => onUpdate({ itemQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Multi-Rate Breakdown */}
            {item.multiRate && item.ratePeriods && item.ratePeriods.length > 0 && (
              <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                    Multi-Rate Booking Breakdown
                  </p>
                </div>
                <div className="space-y-2">
                  {item.ratePeriods.map((period, idx) => (
                    <div key={idx} className="rounded border bg-background p-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {format(period.startDate, "MMM d")} - {format(period.endDate, "MMM d")}
                        </span>
                        <span className="text-muted-foreground">
                          {period.nights} night{period.nights !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {period.rate.rate_name || period.rate.rate_basis}
                        </span>
                        <span className="font-medium">
                          {item.currency} {period.unitPrice.toFixed(2)}/night
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t font-semibold">
                        <span>Period Subtotal:</span>
                        <span>{item.currency} {period.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t-2 font-semibold">
                    <span className="text-sm">Total ({item.nights} nights):</span>
                    <span className="text-base">{item.currency} {(item.subtotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Single Rate Price Breakdown */}
            {!item.multiRate && (item.unitPrice !== undefined || item.subtotal !== undefined || item.profit !== undefined) && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Price Breakdown
                </p>
                <div className="grid gap-1 text-xs">
                  {item.unitPrice !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="font-medium">{item.currency} {item.unitPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {item.subtotal !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{item.currency} {item.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {item.discountAmount && item.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount:</span>
                      <span>-{item.currency} {item.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t font-semibold">
                    <span>Final Price:</span>
                    <span>{item.currency} {(item.finalPrice || item.calculatedPrice || 0).toFixed(2)}</span>
                  </div>
                  {item.profit !== undefined && item.margin !== undefined && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 pt-1 border-t">
                      <span>Profit ({item.margin.toFixed(1)}%):</span>
                      <span className="font-semibold">{item.currency} {item.profit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor={`notes-${item.id}`} className="text-sm font-medium">
                Item Notes (Internal)
              </Label>
              <Textarea
                id={`notes-${item.id}`}
                placeholder="Add internal notes about this item..."
                value={item.notes || ""}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`requests-${item.id}`} className="text-sm font-medium">
                Special Requests
              </Label>
              <Textarea
                id={`requests-${item.id}`}
                placeholder="Add special requests for this item..."
                value={item.specialRequests || ""}
                onChange={(e) => onUpdate({ specialRequests: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

