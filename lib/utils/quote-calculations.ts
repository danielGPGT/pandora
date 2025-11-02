/**
 * Enterprise Quote Calculation Utilities
 * 
 * Handles complex pricing calculations, discounts, taxes, and profit margins
 */

import type { QuoteItem, QuoteDiscount, QuoteTax, QuoteSummary } from "@/lib/types/quotes"
import { PRICING_MODEL, RATE_BASIS } from "@/lib/types/selling-rates"
import { calculateMultiRateBreakdown } from "@/lib/utils/multi-rate-calculation"

/**
 * Calculate detailed price breakdown for a single quote item
 */
export function calculateItemPriceBreakdown(item: QuoteItem): QuoteItem {
  const rate = item.rate
  if (!rate) {
    return { ...item, unitPrice: 0, subtotal: 0, finalPrice: 0, calculatedPrice: 0 }
  }

  let unitPrice = rate.base_price
  const pricingDetails = rate.pricing_details as any

  // Apply pricing model adjustments to get unit price
  switch (rate.pricing_model) {
    case PRICING_MODEL.OCCUPANCY_BASED:
      if (rate.rate_basis === RATE_BASIS.PER_NIGHT) {
        if (item.occupancy === 1 && pricingDetails?.single_occupancy_price) {
          unitPrice = pricingDetails.single_occupancy_price
        } else if (item.occupancy === 2 && pricingDetails?.double_occupancy_price) {
          unitPrice = pricingDetails.double_occupancy_price
        } else if (item.occupancy === 3 && pricingDetails?.triple_occupancy_price) {
          unitPrice = pricingDetails.triple_occupancy_price
        } else if (item.occupancy === 4 && pricingDetails?.quadruple_occupancy_price) {
          unitPrice = pricingDetails.quadruple_occupancy_price
        } else if (pricingDetails?.double_occupancy_price) {
          unitPrice = pricingDetails.double_occupancy_price
        }
      }
      break
    // Add other pricing models as needed
  }

  // Calculate subtotal based on rate basis
  let quantity = 1
  switch (rate.rate_basis) {
    case RATE_BASIS.PER_NIGHT:
      quantity = item.nights
      break
    case RATE_BASIS.PER_PERSON:
      if (rate.pricing_model === PRICING_MODEL.PER_PERSON) {
        quantity = item.occupancy
      } else {
        quantity = item.occupancy * item.nights
      }
      break
    case RATE_BASIS.PER_ITEM:
      quantity = item.itemQuantity
      break
    case RATE_BASIS.PER_BOOKING:
    case RATE_BASIS.FLAT_RATE:
      quantity = 1
      break
  }

  const subtotal = unitPrice * quantity
  const discountAmount = item.discountAmount || 0
  const finalPrice = subtotal - discountAmount

  // Calculate profit if cost is available
  let profit: number | undefined
  let margin: number | undefined
  if (item.cost !== undefined && item.cost !== null) {
    profit = finalPrice - item.cost
    margin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0
  } else if (rate.target_cost !== undefined && rate.target_cost !== null) {
    // Use rate's target cost if item cost not set
    const itemCost = rate.target_cost * quantity
    profit = finalPrice - itemCost
    margin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0
  }

  return {
    ...item,
    unitPrice,
    subtotal,
    finalPrice,
    calculatedPrice: finalPrice, // Keep for backwards compatibility
    profit,
    margin,
  }
}

/**
 * Calculate quote summary from items, discounts, and taxes
 */
export function calculateQuoteSummary(
  items: QuoteItem[],
  discounts: QuoteDiscount[] = [],
  taxes: QuoteTax[] = []
): QuoteSummary {
  // Group items by currency
  const itemsByCurrency = new Map<string, QuoteItem[]>()
  items.forEach((item) => {
    const currency = item.currency || "USD"
    if (!itemsByCurrency.has(currency)) {
      itemsByCurrency.set(currency, [])
    }
    itemsByCurrency.get(currency)!.push(item)
  })

  // Calculate per-currency breakdowns
  const currencyBreakdown = Array.from(itemsByCurrency.entries()).map(([currency, currencyItems]) => {
    let subtotal = currencyItems.reduce((sum, item) => sum + (item.finalPrice || item.calculatedPrice || 0), 0)
    
    // Apply discounts
    let discountsTotal = 0
    discounts.forEach((discount) => {
      if (discount.appliesTo === "items" || !discount.appliesTo) {
        if (discount.type === "percentage") {
          discountsTotal += subtotal * (discount.value / 100)
        } else if (discount.type === "fixed") {
          discountsTotal += discount.value
        }
      }
    })
    
    const subtotalAfterDiscounts = Math.max(0, subtotal - discountsTotal)
    
    // Calculate taxes
    let taxesTotal = 0
    taxes.forEach((tax) => {
      if (tax.currency === currency || !tax.currency) {
        let taxBase = 0
        if (tax.appliesTo === "subtotal") {
          taxBase = subtotalAfterDiscounts
        } else if (tax.appliesTo === "total") {
          taxBase = subtotalAfterDiscounts + taxesTotal
        }
        
        if (tax.type === "percentage") {
          taxesTotal += taxBase * (tax.rate / 100)
        } else {
          taxesTotal += tax.rate
        }
      }
    })
    
    const total = subtotalAfterDiscounts + taxesTotal
    
    return {
      currency,
      subtotal,
      discounts: discountsTotal,
      taxes: taxesTotal,
      total,
    }
  })

  // Primary currency totals (use first currency or most common)
  const primaryBreakdown = currencyBreakdown[0] || {
    currency: "USD",
    subtotal: 0,
    discounts: 0,
    taxes: 0,
    total: 0,
  }

  // Calculate totals across all currencies
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.subtotal || item.finalPrice || item.calculatedPrice || 0), 0)
  
  // Calculate total discounts
  let discountsTotal = 0
  discounts.forEach((discount) => {
    if (discount.type === "percentage" && discount.appliesTo === "quote") {
      discountsTotal += itemsSubtotal * (discount.value / 100)
    } else if (discount.type === "fixed" && discount.appliesTo === "quote") {
      discountsTotal += discount.value
    } else if (discount.appliesTo === "items" || !discount.appliesTo) {
      // Item-level discounts already applied in finalPrice
      const itemDiscounts = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
      discountsTotal = itemDiscounts
    }
  })

  const subtotalAfterDiscounts = Math.max(0, itemsSubtotal - discountsTotal)
  const taxesTotal = taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0)
  const total = subtotalAfterDiscounts + taxesTotal

  // Calculate profit metrics
  const totalCost = items.reduce((sum, item) => sum + (item.cost || item.rate?.target_cost || 0), 0)
  const totalProfit = total - totalCost
  const profitMargin = total > 0 ? (totalProfit / total) * 100 : 0

  return {
    itemsSubtotal,
    discountsTotal,
    subtotalAfterDiscounts,
    taxesTotal,
    total,
    currency: primaryBreakdown.currency,
    totalCost: totalCost > 0 ? totalCost : undefined,
    totalProfit: totalProfit !== 0 ? totalProfit : undefined,
    profitMargin: profitMargin !== 0 ? profitMargin : undefined,
    currencyBreakdown,
  }
}

/**
 * Apply discount to quote items or quote total
 */
export function applyDiscount(
  items: QuoteItem[],
  discount: QuoteDiscount,
  targetItemIds?: string[]
): QuoteItem[] {
  if (discount.appliesTo === "quote") {
    // Quote-level discount - calculate based on total
    return items // Quote-level discounts handled in summary calculation
  }

  // Item-level discount
  return items.map((item) => {
    // If specific items targeted, only apply to those
    if (targetItemIds && !targetItemIds.includes(item.id)) {
      return item
    }

    const subtotal = item.subtotal || item.calculatedPrice || 0
    let discountAmount = 0

    if (discount.type === "percentage") {
      discountAmount = subtotal * (discount.value / 100)
    } else if (discount.type === "fixed") {
      discountAmount = discount.value
    }

    const finalPrice = Math.max(0, subtotal - discountAmount)

    return {
      ...item,
      discountAmount,
      discountPercentage: discount.type === "percentage" ? discount.value : undefined,
      finalPrice,
      calculatedPrice: finalPrice,
    }
  })
}

/**
 * Calculate tax amounts for quote
 */
export function calculateTaxes(
  items: QuoteItem[],
  discounts: QuoteDiscount[],
  taxRules: Array<{ name: string; type: "percentage" | "fixed"; rate: number; appliesTo: "subtotal" | "discount" | "total" }>
): QuoteTax[] {
  const summary = calculateQuoteSummary(items, discounts, [])
  
  return taxRules.map((rule, index) => {
    let taxBase = 0
    if (rule.appliesTo === "subtotal") {
      taxBase = summary.subtotalAfterDiscounts
    } else if (rule.appliesTo === "total") {
      taxBase = summary.total
    }

    let amount = 0
    if (rule.type === "percentage") {
      amount = taxBase * (rule.rate / 100)
    } else {
      amount = rule.rate
    }

    return {
      id: `tax-${index}`,
      name: rule.name,
      type: rule.type,
      rate: rule.rate,
      appliesTo: rule.appliesTo,
      amount,
    }
  })
}

