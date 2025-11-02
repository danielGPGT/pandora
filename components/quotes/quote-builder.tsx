/**
 * Quote Builder
 * 
 * Allows users to search for products, add them to a quote cart,
 * configure each item (dates, occupancy, quantity), and calculate totals
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, differenceInDays } from "date-fns"
import { Plus, Trash2, ShoppingCart, Calculator, FileText, Calendar, Package } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { cn } from "@/lib/utils"
import { RATE_BASIS, PRICING_MODEL } from "@/lib/types/selling-rates"
import type { ProductDetailsResult, SellingRateDetails } from "@/lib/data/products"
import { searchProducts, fetchProductDetailsForQuote } from "@/lib/actions/quotes"
import { filterRatesByDateRange, getApplicableRates, findBestRate } from "@/lib/utils/rate-filtering"
import { calculateItemPriceBreakdown, calculateQuoteSummary, applyDiscount, calculateTaxes } from "@/lib/utils/quote-calculations"
import { validateQuoteItems, validateBusinessRules, type QuoteValidationResult } from "@/lib/utils/quote-validation"
import type { QuoteItem, QuoteDiscount, QuoteTax, QuoteSummary, QuoteMetadata } from "@/lib/types/quotes"
import { QuoteItemCardEnhanced } from "@/components/quotes/quote-item-card-enhanced"

type QuoteBuilderProps = {}

export function QuoteBuilder({}: QuoteBuilderProps) {
  const router = useRouter()
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [globalDateRange, setGlobalDateRange] = useState<{ from: Date; to?: Date } | undefined>({
    from: new Date(),
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  })
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  
  // Enterprise quote features
  const [quoteMetadata, setQuoteMetadata] = useState<QuoteMetadata>({
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    expirationDays: 30,
  })
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>([])
  const [taxes, setTaxes] = useState<QuoteTax[]>([])
  const [validationResult, setValidationResult] = useState<QuoteValidationResult | null>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Load products with valid rates for selected dates
  const loadAvailableProducts = async () => {
    if (!globalDateRange?.from || !globalDateRange?.to) {
      setAvailableProducts([])
      return
    }

    setIsLoadingProducts(true)
    try {
      // Get all active products
      const productsResult = await searchProducts({
        q: "",
        page: 1,
        pageSize: 100, // Get more products
        sort: "name",
        dir: "asc",
        is_active: "true",
      })

      // Fetch details for each product to get options and rates
      const productsWithRates = await Promise.all(
        (productsResult.rows || []).map(async (product) => {
          try {
            const details = await fetchProductDetailsForQuote(product.id)
            if (!details || !details.options || details.options.length === 0) {
              return null
            }

            // Filter options that have valid rates for the date range
            const optionsWithValidRates = details.options
              .map((option) => {
                const validRates = getApplicableRates(
                  option.selling_rates || [],
                  globalDateRange.from,
                  globalDateRange.to
                )
                
                if (validRates.length === 0) return null

                return {
                  ...option,
                  validRates,
                }
              })
              .filter((opt) => opt !== null)

            if (optionsWithValidRates.length === 0) return null

            return {
              ...product,
              options: optionsWithValidRates,
            }
          } catch (error) {
            console.error(`Error loading product ${product.id}:`, error)
            return null
          }
        })
      )

      setAvailableProducts(productsWithRates.filter((p) => p !== null))
    } catch (error) {
      console.error("Error loading products:", error)
      setAvailableProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // Load products when date range changes
  const handleDateRangeChange = (range: { from: Date; to?: Date } | undefined) => {
    setGlobalDateRange(range)
    if (range?.from && range?.to) {
      loadAvailableProducts()
    } else {
      setAvailableProducts([])
    }
  }

  // Add product option to quote
  const handleAddOption = (product: any, option: any) => {
    if (!globalDateRange?.from || !globalDateRange?.to) {
      alert("Please select dates first")
      return
    }

    const bookingStart = globalDateRange.from
    const bookingEnd = globalDateRange.to
    
    // Find best rate from the pre-filtered valid rates
    const bestRate = findBestRate(
      option.validRates || [],
      bookingStart,
      bookingEnd,
      2 // Default occupancy
    )

    if (!bestRate) {
      alert("No valid rate found for this option and date range")
      return
    }

    const nights = differenceInDays(new Date(bookingEnd), new Date(bookingStart)) + 1

    const newItem: QuoteItem = {
      id: `${product.id}-${option.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      optionId: option.id,
      optionName: option.option_name,
      optionCode: option.option_code,
      rate: bestRate,
      rateId: bestRate.id,
      dateRange: globalDateRange,
      nights,
      occupancy: 2,
      itemQuantity: 1,
      unitPrice: 0,
      subtotal: 0,
      discountAmount: 0,
      finalPrice: 0,
      calculatedPrice: 0,
      currency: bestRate.currency || "USD",
      cost: bestRate.target_cost || undefined,
    }

    // Calculate initial price
    const itemWithPrice = calculateItemPrice(newItem)
    setQuoteItems([...quoteItems, itemWithPrice])
    setSelectedItemId(itemWithPrice.id)
  }

  // Remove item from quote
  const handleRemoveItem = (itemId: string) => {
    setQuoteItems(quoteItems.filter((item) => item.id !== itemId))
    if (selectedItemId === itemId) {
      setSelectedItemId(null)
    }
  }

  // Calculate price for a single quote item
  const calculateItemPrice = (item: QuoteItem): QuoteItem => {
    if (!item.rate || !item.dateRange?.from || !item.dateRange?.to) {
      return { ...item, calculatedPrice: 0 }
    }

    const rate = item.rate
    let basePrice = rate.base_price
    const pricingDetails = rate.pricing_details as any

    // Apply pricing model adjustments
    switch (rate.pricing_model) {
      case PRICING_MODEL.OCCUPANCY_BASED:
        if (rate.rate_basis === RATE_BASIS.PER_NIGHT) {
          // Handle occupancy-based pricing
          if (item.occupancy === 1 && pricingDetails?.single_occupancy_price) {
            basePrice = pricingDetails.single_occupancy_price
          } else if (item.occupancy === 2 && pricingDetails?.double_occupancy_price) {
            basePrice = pricingDetails.double_occupancy_price
          } else if (item.occupancy === 3 && pricingDetails?.triple_occupancy_price) {
            basePrice = pricingDetails.triple_occupancy_price
          } else if (item.occupancy === 4 && pricingDetails?.quadruple_occupancy_price) {
            basePrice = pricingDetails.quadruple_occupancy_price
          } else if (pricingDetails?.double_occupancy_price) {
            basePrice = pricingDetails.double_occupancy_price
          }
        }
        break
      // Add other pricing model calculations as needed
    }

    // Calculate total based on rate basis
    let total = 0
    switch (rate.rate_basis) {
      case RATE_BASIS.PER_NIGHT:
        total = basePrice * item.nights
        break
      case RATE_BASIS.PER_PERSON:
        if (rate.pricing_model === PRICING_MODEL.PER_PERSON) {
          total = basePrice * item.occupancy
        } else {
          total = basePrice * item.occupancy * item.nights
        }
        break
      case RATE_BASIS.PER_ITEM:
        total = basePrice * item.itemQuantity
        break
      case RATE_BASIS.PER_BOOKING:
      case RATE_BASIS.FLAT_RATE:
        total = basePrice
        break
    }

    return { ...item, calculatedPrice: total }
  }

  // Update item configuration
  const handleUpdateItem = (itemId: string, updates: Partial<QuoteItem>) => {
    setQuoteItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates }
          // Recalculate price if relevant fields changed
          if (
            updates.rate ||
            updates.dateRange ||
            updates.nights ||
            updates.occupancy ||
            updates.itemQuantity !== undefined
          ) {
            // Recalculate nights from date range
            if (updates.dateRange?.from && updates.dateRange?.to) {
              const nights = differenceInDays(new Date(updates.dateRange.to), new Date(updates.dateRange.from)) + 1
              updated.nights = nights
            }
            // Update cost if rate changed
            if (updates.rate && updates.rate.target_cost) {
              updated.cost = updates.rate.target_cost
            }
            return calculateItemPrice(updated)
          }
          return updated
        }
        return item
      })
    )
  }

  // Load products on mount if dates are already set
  useEffect(() => {
    if (globalDateRange?.from && globalDateRange?.to) {
      loadAvailableProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Calculate comprehensive quote summary
  const quoteSummary = useMemo(() => {
    // Recalculate all items with latest pricing
    const recalculatedItems = quoteItems.map((item) => calculateItemPriceBreakdown(item))
    
    // Apply discounts
    let itemsWithDiscounts = recalculatedItems
    discounts.forEach((discount) => {
      itemsWithDiscounts = applyDiscount(itemsWithDiscounts, discount)
    })
    
    // Calculate taxes
    const calculatedTaxes = calculateTaxes(itemsWithDiscounts, discounts, [
      // Example tax rules - could come from settings
      // { name: "VAT", type: "percentage", rate: 10, appliesTo: "subtotal" },
    ])
    
    // Calculate final summary
    return calculateQuoteSummary(itemsWithDiscounts, discounts, calculatedTaxes)
  }, [quoteItems, discounts])

  // Validate quote
  const validationSummary = useMemo(() => {
    const itemValidation = validateQuoteItems(quoteItems)
    const businessRulesValidation = validateBusinessRules({
      items: quoteItems,
      totalAmount: quoteSummary.total,
      currency: quoteSummary.currency,
    })
    
    return {
      isValid: itemValidation.isValid && businessRulesValidation.isValid,
      errors: [...itemValidation.errors, ...businessRulesValidation.errors],
      warnings: [...itemValidation.warnings, ...businessRulesValidation.warnings],
    }
  }, [quoteItems, quoteSummary])

  // Update validation result
  useEffect(() => {
    setValidationResult(validationSummary)
  }, [validationSummary])

  return (
      <div className="space-y-6">
      {/* Global Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quote Period
          </CardTitle>
          <CardDescription>
            Set the booking period. Only rates valid for these dates will be shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            value={globalDateRange}
            onChange={handleDateRangeChange}
            placeholder="Select booking dates to see available products"
          />
          {globalDateRange?.from && globalDateRange?.to && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing products with rates available from {format(globalDateRange.from, "MMM d, yyyy")} to {format(globalDateRange.to, "MMM d, yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Available Products
          </CardTitle>
          <CardDescription>
            Products and options with rates valid for the selected dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!globalDateRange?.from || !globalDateRange?.to ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select dates above to see available products</p>
            </div>
          ) : isLoadingProducts ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading products...</p>
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products with valid rates for the selected dates</p>
              <p className="text-sm mt-2">Try selecting different dates</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {availableProducts.map((product) => (
                <div key={product.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span>{product.code}</span>
                        {product.product_type && (
                          <Badge variant="outline" className="text-xs">
                            {product.product_type.type_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Options ({product.options?.length || 0})
                    </p>
                    {product.options?.map((option: any) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{option.option_name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {option.option_code} · {option.validRates?.length || 0} rate{option.validRates?.length !== 1 ? "s" : ""} available
                          </div>
                          {option.validRates && option.validRates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {option.validRates.slice(0, 3).map((rate: SellingRateDetails) => (
                                <Badge key={rate.id} variant="outline" className="text-xs">
                                  {rate.currency} {rate.base_price.toFixed(0)}
                                </Badge>
                              ))}
                              {option.validRates.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{option.validRates.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddOption(product, option)}
                          className="ml-4"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Cart */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Quote Items ({quoteItems.length})
            </CardTitle>
            <CardDescription>
              Configure each item's dates, occupancy, and pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quoteItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items in quote yet</p>
                <p className="text-sm mt-2">Search for products above to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quoteItems.map((item) => (
                  <QuoteItemCardEnhanced
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onRemove={() => handleRemoveItem(item.id)}
                    productDetails={null}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enterprise Quote Summary */}
        <div className="space-y-6">
          {/* Validation Alerts */}
          {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <Card className={cn(
              validationResult.errors.length > 0 ? "border-destructive" : "border-yellow-500/50"
            )}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {validationResult.errors.map((error, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-destructive">●</span>
                      <span className="text-destructive">{error.message}</span>
                    </div>
                  ))}
                  {validationResult.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600">⚠</span>
                      <span className="text-yellow-900 dark:text-yellow-100">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Quote Summary
              </CardTitle>
              <CardDescription>
                Comprehensive breakdown with profit margins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quoteItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add items to see quote totals</p>
              ) : (
                <>
                  {/* Line Items */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Line Items
                    </p>
                    {quoteItems.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-muted/20 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {item.productName} - {item.optionName}
                          </span>
                          <span className="text-sm font-semibold">
                            {item.currency} {(item.finalPrice || item.calculatedPrice || 0).toFixed(2)}
                          </span>
                        </div>
                        {(item.unitPrice !== undefined || item.subtotal !== undefined) && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {item.unitPrice !== undefined && (
                              <div className="flex justify-between">
                                <span>Unit Price:</span>
                                <span>{item.currency} {item.unitPrice.toFixed(2)}</span>
                              </div>
                            )}
                            {item.subtotal !== undefined && item.subtotal !== (item.finalPrice || item.calculatedPrice) && (
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{item.currency} {item.subtotal.toFixed(2)}</span>
                              </div>
                            )}
                            {item.discountAmount && item.discountAmount > 0 && (
                              <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Discount:</span>
                                <span>-{item.currency} {item.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {item.profit !== undefined && item.margin !== undefined && (
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            <div className="flex justify-between">
                              <span>Profit:</span>
                              <span className="text-green-600 dark:text-green-400">
                                {item.currency} {item.profit.toFixed(2)} ({item.margin.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Items Subtotal</span>
                      <span className="font-medium">
                        {quoteSummary.currency} {quoteSummary.itemsSubtotal.toFixed(2)}
                      </span>
                    </div>

                    {quoteSummary.discountsTotal > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Discounts</span>
                        <span className="font-medium">
                          -{quoteSummary.currency} {quoteSummary.discountsTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {quoteSummary.taxesTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Taxes</span>
                        <span className="font-medium">
                          {quoteSummary.currency} {quoteSummary.taxesTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">Total</span>
                      <span className="text-2xl font-bold">
                        {quoteSummary.currency} {quoteSummary.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Profit Summary */}
                    {quoteSummary.totalCost !== undefined && quoteSummary.totalProfit !== undefined && (
                      <>
                        <Separator />
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Profit Analysis
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Cost</span>
                            <span>{quoteSummary.currency} {quoteSummary.totalCost.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Profit</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {quoteSummary.currency} {quoteSummary.totalProfit.toFixed(2)}
                            </span>
                          </div>
                          {quoteSummary.profitMargin !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Profit Margin</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {quoteSummary.profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Currency Breakdown (if multiple currencies) */}
                  {quoteSummary.currencyBreakdown.length > 1 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          By Currency
                        </p>
                        {quoteSummary.currencyBreakdown.map((breakdown) => (
                          <div key={breakdown.currency} className="text-xs space-y-1">
                            <div className="font-medium">{breakdown.currency}</div>
                            <div className="flex justify-between text-muted-foreground pl-2">
                              <span>Subtotal:</span>
                              <span>{breakdown.currency} {breakdown.subtotal.toFixed(2)}</span>
                            </div>
                            {breakdown.discounts > 0 && (
                              <div className="flex justify-between text-green-600 dark:text-green-400 pl-2">
                                <span>Discounts:</span>
                                <span>-{breakdown.currency} {breakdown.discounts.toFixed(2)}</span>
                              </div>
                            )}
                            {breakdown.taxes > 0 && (
                              <div className="flex justify-between text-muted-foreground pl-2">
                                <span>Taxes:</span>
                                <span>{breakdown.currency} {breakdown.taxes.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold pt-1 border-t">
                              <span>Total:</span>
                              <span>{breakdown.currency} {breakdown.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Separator />

                  <Button 
                    className="w-full" 
                    size="lg"
                    disabled={!validationResult?.isValid}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {validationResult?.isValid ? "Generate Quote Document" : "Fix Errors to Generate Quote"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Quote Item Card Component
type QuoteItemCardProps = {
  item: QuoteItem
  onUpdate: (updates: Partial<QuoteItem>) => void
  onRemove: () => void
  productDetails: ProductDetailsResult | null
}

function QuoteItemCard({ item, onUpdate, onRemove, productDetails }: QuoteItemCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Fetch product details if needed (for options and rates)
  const [availableOptions, setAvailableOptions] = useState<any[]>([])
  const [availableRates, setAvailableRates] = useState<SellingRateDetails[]>([])

  // Load product details when expanded
  const loadProductDetails = async () => {
    if (productDetails) {
      setAvailableOptions(productDetails.options || [])
      const option = productDetails.options.find((opt) => opt.id === item.optionId)
      setAvailableRates(option?.selling_rates.filter((r) => r.is_active) || [])
      return
    }

    try {
      const details = await fetchProductDetailsForQuote(item.productId)
      if (details) {
        setAvailableOptions(details.options || [])
        const option = details.options.find((opt) => opt.id === item.optionId)
        setAvailableRates(option?.selling_rates.filter((r) => r.is_active) || [])
      }
    } catch (error) {
      console.error("Error loading product details:", error)
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-medium">{item.productName}</div>
            <div className="text-sm text-muted-foreground">
              {item.productCode} · {item.optionName} ({item.optionCode})
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowDetails(!showDetails)
            if (!showDetails) {
              loadProductDetails()
            }
          }}
          className="w-full"
        >
          {showDetails ? "Hide Details" : "Configure Item"}
        </Button>

        {showDetails && (
          <div className="space-y-4 pt-3 border-t">
            {/* Option Selector */}
            {availableOptions.length > 1 && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Option</label>
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
                        currency: firstRate?.currency || item.currency,
                      })
                      const optionRates = option.selling_rates.filter((r) => r.is_active)
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
              <label className="text-sm font-medium">Rate</label>
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
                    value={item.rate?.id || ""}
                    onValueChange={(rateId) => {
                      const rate = availableRates.find((r) => r.id === rateId) || null
                      onUpdate({
                        rate,
                        currency: rate?.currency || item.currency,
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
                    {availableRates.length} rate{availableRates.length !== 1 ? "s" : ""} available for selected dates
                  </p>
                </>
              )}
            </div>

            {/* Date Range */}
            {item.rate?.rate_basis !== RATE_BASIS.PER_BOOKING && 
             item.rate?.rate_basis !== RATE_BASIS.FLAT_RATE && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Dates</label>
                <DateRangePicker
                  value={item.dateRange}
                  onChange={(range) => {
                    onUpdate({ dateRange: range })
                    if (range?.from && range?.to) {
                      const nights = differenceInDays(new Date(range.to), new Date(range.from)) + 1
                      onUpdate({ nights })
                      
                      // Reload rates for new date range
                      setTimeout(() => {
                        loadProductDetails()
                      }, 100)
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
                <label className="text-sm font-medium">Number of Nights</label>
                <Input
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
              <div className="grid gap-2">
                <label className="text-sm font-medium">Number of People / Occupancy</label>
                <Input
                  type="number"
                  min="1"
                  value={item.occupancy}
                  onChange={(e) => onUpdate({ occupancy: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Item Quantity (for PER_ITEM) */}
            {item.rate?.rate_basis === RATE_BASIS.PER_ITEM && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Number of Items/Tickets</label>
                <Input
                  type="number"
                  min="1"
                  value={item.itemQuantity}
                  onChange={(e) => onUpdate({ itemQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Price Display */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item Total</span>
                <span className="text-lg font-bold">
                  {item.currency} {item.calculatedPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

