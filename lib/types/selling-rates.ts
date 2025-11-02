/**
 * Type-safe selling rates system
 * 
 * Provides enums, interfaces, and type guards for selling rates
 * following the same patterns as product option attributes
 */

// ============================================================================
// Rate Basis Enum
// ============================================================================

export const RATE_BASIS = {
  PER_NIGHT: "per_night",
  PER_PERSON: "per_person",
  PER_ITEM: "per_item",
  PER_BOOKING: "per_booking",
  FLAT_RATE: "flat_rate",
} as const

export type RateBasis = typeof RATE_BASIS[keyof typeof RATE_BASIS]

// ============================================================================
// Pricing Model Enum
// ============================================================================

export const PRICING_MODEL = {
  STANDARD: "standard",
  EXTRA_NIGHT: "extra_night",
  WEEKEND: "weekend",
  PER_PERSON: "per_person",
  TIERED: "tiered",
  PASS_TYPE: "pass_type",
  SEASONAL: "seasonal",
  EARLY_BIRD: "early_bird",
  LAST_MINUTE: "last_minute",
  OCCUPANCY_BASED: "occupancy_based",
} as const

export type PricingModel = typeof PRICING_MODEL[keyof typeof PRICING_MODEL]

// ============================================================================
// Markup Type Enum
// ============================================================================

export const MARKUP_TYPE = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
} as const

export type MarkupType = typeof MARKUP_TYPE[keyof typeof MARKUP_TYPE]

// ============================================================================
// Pricing Details Interfaces (Type-Safe for each model)
// ============================================================================

export interface StandardPricingDetails {
  // No special fields needed for standard pricing
}

export interface ExtraNightPricingDetails {
  min_nights: number
  max_nights?: number
}

export interface WeekendPricingDetails {
  valid_day_mask: {
    monday?: boolean
    tuesday?: boolean
    wednesday?: boolean
    thursday?: boolean
    friday?: boolean
    saturday?: boolean
    sunday?: boolean
  }
  uplift_percentage?: number // Optional percentage uplift (e.g., 10 for 10%)
}

export interface PerPersonPricingDetails {
  pricing_tiers: Array<{
    min_pax: number
    max_pax?: number
    price: number
  }>
  base_pax?: number // Minimum number of people required for booking
}

export interface TieredPricingDetails {
  tiers: Array<{
    min_quantity?: number
    max_quantity?: number
    price: number
    description?: string
  }>
  quantity_type: "nights" | "units" | "people"
}

export interface PassTypePricingDetails {
  pass_type: string // e.g., "single_day", "multi_day", "vip"
  access_level?: string[]
  validity_days?: number
}

export interface SeasonalPricingDetails {
  season_name: string
  season_months: number[] // 1-12 (January = 1, December = 12)
  blackout_dates?: string[] // ISO date strings
}

export interface EarlyBirdPricingDetails {
  booking_days_ahead: number // Must book X days in advance
  discount_percentage?: number
  discount_amount?: number
}

export interface LastMinutePricingDetails {
  booking_days_max: number // Must book within X days
  discount_percentage?: number
  discount_amount?: number
}

export interface OccupancyBasedPricingDetails {
  single_occupancy_price: number // Rate for 1 person (required)
  double_occupancy_price: number // Rate for 2 people (required)
  triple_occupancy_price?: number // Optional rate for 3 people
  quadruple_occupancy_price?: number // Optional rate for 4 people (for suites)
  extra_person_charge?: number // Per person charge after base occupancy
  base_occupancy: 1 | 2 // Base occupancy for extra person calculation (default: 2)
}

// Union type for all pricing details
export type PricingDetails =
  | StandardPricingDetails
  | ExtraNightPricingDetails
  | WeekendPricingDetails
  | PerPersonPricingDetails
  | TieredPricingDetails
  | PassTypePricingDetails
  | SeasonalPricingDetails
  | EarlyBirdPricingDetails
  | LastMinutePricingDetails
  | OccupancyBasedPricingDetails

// ============================================================================
// Main Selling Rate Interface
// ============================================================================

export interface SellingRate {
  id: string
  organization_id: string
  product_id: string
  product_option_id: string | null
  rate_name: string | null
  rate_basis: RateBasis
  pricing_model: PricingModel
  valid_from: Date | string
  valid_to: Date | string
  base_price: number
  currency: string
  markup_type: MarkupType | null
  markup_amount: number | null
  pricing_details: PricingDetails
  is_active: boolean
  target_cost: number | null
  created_at: Date | string
  updated_at: Date | string
}

// ============================================================================
// Type Guards
// ============================================================================

export function isExtraNightPricing(
  details: PricingDetails
): details is ExtraNightPricingDetails {
  return "min_nights" in details && typeof details.min_nights === "number"
}

export function isWeekendPricing(
  details: PricingDetails
): details is WeekendPricingDetails {
  return "valid_day_mask" in details && typeof details.valid_day_mask === "object"
}

export function isPerPersonPricing(
  details: PricingDetails
): details is PerPersonPricingDetails {
  return "pricing_tiers" in details && Array.isArray(details.pricing_tiers)
}

export function isTieredPricing(
  details: PricingDetails
): details is TieredPricingDetails {
  return "tiers" in details && Array.isArray(details.tiers) && "quantity_type" in details
}

export function isPassTypePricing(
  details: PricingDetails
): details is PassTypePricingDetails {
  return "pass_type" in details && typeof details.pass_type === "string"
}

export function isSeasonalPricing(
  details: PricingDetails
): details is SeasonalPricingDetails {
  return "season_name" in details && "season_months" in details && Array.isArray(details.season_months)
}

export function isEarlyBirdPricing(
  details: PricingDetails
): details is EarlyBirdPricingDetails {
  return "booking_days_ahead" in details && typeof details.booking_days_ahead === "number"
}

export function isLastMinutePricing(
  details: PricingDetails
): details is LastMinutePricingDetails {
  return "booking_days_max" in details && typeof details.booking_days_max === "number"
}

export function isOccupancyBasedPricing(
  details: PricingDetails
): details is OccupancyBasedPricingDetails {
  return (
    "single_occupancy_price" in details &&
    typeof details.single_occupancy_price === "number" &&
    "double_occupancy_price" in details &&
    typeof details.double_occupancy_price === "number"
  )
}

// ============================================================================
// Validators
// ============================================================================

export function validateRateBasis(basis: string): basis is RateBasis {
  return Object.values(RATE_BASIS).includes(basis as RateBasis)
}

export function validatePricingModel(model: string): model is PricingModel {
  return Object.values(PRICING_MODEL).includes(model as PricingModel)
}

export function validateMarkupType(type: string | null): type is MarkupType | null {
  if (type === null) return true
  return Object.values(MARKUP_TYPE).includes(type as MarkupType)
}

