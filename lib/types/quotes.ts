/**
 * Enterprise Quote Types
 * 
 * Comprehensive type definitions for quote management system
 */

import type { SellingRateDetails } from "@/lib/data/products"

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"

export type QuoteItem = {
  id: string
  productId: string
  productName: string
  productCode: string
  optionId: string
  optionName: string
  optionCode: string
  rate: SellingRateDetails | null // Primary rate (may not cover full date range)
  rateId: string | null
  multiRate?: boolean // True if booking spans multiple rates
  ratePeriods?: Array<{
    rate: SellingRateDetails
    startDate: Date
    endDate: Date
    nights: number
    unitPrice: number
    subtotal: number
  }>
  dateRange: { from: Date; to?: Date } | undefined
  nights: number
  occupancy: number
  itemQuantity: number
  adults?: number
  children?: number
  infants?: number
  unitPrice: number // Price per unit before discounts (for single rate)
  subtotal: number // Unit price × quantity (for single rate) or sum of periods
  discountAmount: number // Discount applied to this item
  discountPercentage?: number
  finalPrice: number // Subtotal - discount
  currency: string
  cost?: number // Target cost for profit calculation
  margin?: number // Profit margin percentage
  profit?: number // Calculated profit
  notes?: string
  specialRequests?: string
}

export type QuoteDiscount = {
  id: string
  type: "percentage" | "fixed" | "package"
  value: number
  description: string
  appliesTo?: "items" | "quote" // Item-level or quote-level
}

export type QuoteTax = {
  id: string
  name: string
  type: "percentage" | "fixed"
  rate: number
  appliesTo: "subtotal" | "discount" | "total"
  amount: number
}

export type QuoteMetadata = {
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  contactPerson?: string
  companyName?: string
  billingAddress?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  notes?: string
  internalNotes?: string
  terms?: string
  validUntil?: Date
  expirationDays?: number
  referenceNumber?: string
  salesPersonId?: string
  salesPersonName?: string
}

export type QuoteSummary = {
  itemsSubtotal: number // Sum of all item final prices
  discountsTotal: number // Total discounts applied
  subtotalAfterDiscounts: number // Items - discounts
  taxesTotal: number // Total taxes
  total: number // Final total
  currency: string
  
  // Profit calculations
  totalCost?: number // Sum of all item costs
  totalProfit?: number // Total - cost
  profitMargin?: number // (profit / total) × 100
  
  // Breakdown by currency
  currencyBreakdown: Array<{
    currency: string
    subtotal: number
    discounts: number
    taxes: number
    total: number
  }>
}

export type Quote = {
  id?: string
  organizationId: string
  quoteNumber?: string
  status: QuoteStatus
  items: QuoteItem[]
  discounts: QuoteDiscount[]
  taxes: QuoteTax[]
  summary: QuoteSummary
  metadata: QuoteMetadata
  createdAt?: Date
  updatedAt?: Date
  expiresAt?: Date
  sentAt?: Date
  acceptedAt?: Date
  convertedToBookingId?: string
  version?: number
  previousVersionId?: string
}

export type QuoteValidationIssue = {
  severity: "error" | "warning" | "info"
  code: string
  message: string
  field?: string
  itemId?: string
}

