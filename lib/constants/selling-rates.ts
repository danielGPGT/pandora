/**
 * Constants and metadata for selling rates
 * 
 * Provides options, labels, descriptions, and configuration
 */

import { RATE_BASIS, PRICING_MODEL, MARKUP_TYPE, type RateBasis, type PricingModel, type MarkupType } from "@/lib/types/selling-rates"
import { Calendar, Users, Package, ShoppingCart, DollarSign } from "lucide-react"

// ============================================================================
// Rate Basis Options (for dropdowns)
// ============================================================================

export interface RateBasisOption {
  value: RateBasis
  label: string
  description: string
  icon: typeof Calendar
  compatibleModels: PricingModel[]
}

export const RATE_BASIS_OPTIONS: Record<RateBasis, RateBasisOption> = {
  [RATE_BASIS.PER_NIGHT]: {
    value: RATE_BASIS.PER_NIGHT,
    label: "Per Night",
    description: "Price charged per night of accommodation",
    icon: Calendar,
    compatibleModels: [
      PRICING_MODEL.STANDARD,
      PRICING_MODEL.EXTRA_NIGHT,
      PRICING_MODEL.WEEKEND,
      PRICING_MODEL.SEASONAL,
      PRICING_MODEL.EARLY_BIRD,
      PRICING_MODEL.LAST_MINUTE,
      PRICING_MODEL.OCCUPANCY_BASED,
    ],
  },
  [RATE_BASIS.PER_PERSON]: {
    value: RATE_BASIS.PER_PERSON,
    label: "Per Person",
    description: "Price charged per person",
    icon: Users,
    compatibleModels: [
      PRICING_MODEL.STANDARD,
      PRICING_MODEL.PER_PERSON,
      PRICING_MODEL.TIERED,
      PRICING_MODEL.WEEKEND,
      PRICING_MODEL.SEASONAL,
    ],
  },
  [RATE_BASIS.PER_ITEM]: {
    value: RATE_BASIS.PER_ITEM,
    label: "Per Item",
    description: "Price charged per item or unit",
    icon: Package,
    compatibleModels: [
      PRICING_MODEL.STANDARD,
      PRICING_MODEL.TIERED,
      PRICING_MODEL.SEASONAL,
    ],
  },
  [RATE_BASIS.PER_BOOKING]: {
    value: RATE_BASIS.PER_BOOKING,
    label: "Per Booking",
    description: "Fixed price per booking regardless of quantity",
    icon: ShoppingCart,
    compatibleModels: [
      PRICING_MODEL.STANDARD,
      PRICING_MODEL.PASS_TYPE,
      PRICING_MODEL.EARLY_BIRD,
      PRICING_MODEL.LAST_MINUTE,
    ],
  },
  [RATE_BASIS.FLAT_RATE]: {
    value: RATE_BASIS.FLAT_RATE,
    label: "Flat Rate",
    description: "Single fixed price",
    icon: DollarSign,
    compatibleModels: [
      PRICING_MODEL.STANDARD,
    ],
  },
}

// ============================================================================
// Pricing Model Information (for dropdowns and tooltips)
// ============================================================================

export interface PricingModelInfo {
  value: PricingModel
  label: string
  description: string
  color: "blue" | "purple" | "green" | "orange" | "pink" | "cyan"
  example?: string
}

export const PRICING_MODEL_INFO: Record<PricingModel, PricingModelInfo> = {
  [PRICING_MODEL.STANDARD]: {
    value: PRICING_MODEL.STANDARD,
    label: "Standard Rate",
    description: "Default pricing with no special conditions",
    color: "blue",
    example: "Base nightly rate, standard tour price",
  },
  [PRICING_MODEL.EXTRA_NIGHT]: {
    value: PRICING_MODEL.EXTRA_NIGHT,
    label: "Extra Night",
    description: "Applies to stays beyond standard length",
    color: "purple",
    example: "Discount for stays 5+ nights",
  },
  [PRICING_MODEL.WEEKEND]: {
    value: PRICING_MODEL.WEEKEND,
    label: "Weekend Uplift",
    description: "Weekend pricing adjustment for accommodation or extras",
    color: "green",
    example: "10% uplift for Friday/Saturday bookings",
  },
  [PRICING_MODEL.PER_PERSON]: {
    value: PRICING_MODEL.PER_PERSON,
    label: "Per Person",
    description: "Per-person pricing with tiered group discounts",
    color: "orange",
    example: "Group discounts: 1-3 people $120, 4+ people $100",
  },
  [PRICING_MODEL.TIERED]: {
    value: PRICING_MODEL.TIERED,
    label: "Tiered Pricing",
    description: "Tiered rate based on quantity or stay length",
    color: "pink",
    example: "Quantity discounts: 1-5 units $50, 6+ units $40",
  },
  [PRICING_MODEL.PASS_TYPE]: {
    value: PRICING_MODEL.PASS_TYPE,
    label: "Pass Type",
    description: "Distinguishes ticket types (single day, multi day, VIP, etc.)",
    color: "cyan",
    example: "Single day pass, 3-day pass, VIP access",
  },
  [PRICING_MODEL.SEASONAL]: {
    value: PRICING_MODEL.SEASONAL,
    label: "Seasonal",
    description: "Season-specific pricing with month ranges",
    color: "blue",
    example: "Summer rates (June-August), peak season pricing",
  },
  [PRICING_MODEL.EARLY_BIRD]: {
    value: PRICING_MODEL.EARLY_BIRD,
    label: "Early Bird",
    description: "Discount for bookings made in advance",
    color: "green",
    example: "10% off if booked 30+ days ahead",
  },
  [PRICING_MODEL.LAST_MINUTE]: {
    value: PRICING_MODEL.LAST_MINUTE,
    label: "Last Minute",
    description: "Discount for last-minute bookings",
    color: "orange",
    example: "15% off if booked within 7 days",
  },
  [PRICING_MODEL.OCCUPANCY_BASED]: {
    value: PRICING_MODEL.OCCUPANCY_BASED,
    label: "Occupancy Based",
    description: "Hotel room pricing based on number of occupants (single/double/triple)",
    color: "blue",
    example: "Single: $180, Double: $150, Triple: $220, Extra person: $40",
  },
}

// ============================================================================
// Markup Type Options
// ============================================================================

export interface MarkupTypeOption {
  value: MarkupType | null
  label: string
  description: string
}

export const MARKUP_TYPE_OPTIONS: MarkupTypeOption[] = [
  {
    value: null,
    label: "None",
    description: "No markup applied",
  },
  {
    value: MARKUP_TYPE.PERCENTAGE,
    label: "Percentage",
    description: "Markup as percentage of base price (e.g., 15% markup)",
  },
  {
    value: MARKUP_TYPE.FIXED,
    label: "Fixed Amount",
    description: "Fixed markup amount added to base price",
  },
]

// ============================================================================
// Supported Currencies
// ============================================================================

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "SGD", "HKD"] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

// ============================================================================
// Validation Rules
// ============================================================================

export const SELLING_RATES_VALIDATION = {
  MIN_BASE_PRICE: 0,
  MAX_BASE_PRICE: 999999.99,
  MIN_VALIDITY_DAYS: 1,
  MAX_VALIDITY_DAYS: 365 * 5, // 5 years max
  MARKUP_PERCENTAGE_MAX: 1000, // 1000% max markup
  MIN_MARKUP_AMOUNT: 0,
} as const

// ============================================================================
// Default Values
// ============================================================================

export const SELLING_RATES_DEFAULTS = {
  CURRENCY: "USD" as SupportedCurrency,
  RATE_BASIS: RATE_BASIS.PER_NIGHT,
  PRICING_MODEL: PRICING_MODEL.STANDARD,
  IS_ACTIVE: true,
  BASE_PRICE: 0,
} as const

