# Perfect Selling Rates Structure

This document outlines the ideal architecture and implementation for selling rates in the Pandora system.

## 🎯 Core Design Principles

1. **Type Safety First** - Strong TypeScript types for all pricing models
2. **Extensibility** - Easy to add new pricing models without breaking changes
3. **User Experience** - Smart forms that adapt to pricing model selection
4. **Auto-Normalization** - Following the occupancy pattern: automatic validation and correction of nested data structures with `useEffect` hooks
5. **Business Intelligence** - Built-in rate conflict detection and validation
6. **Developer Experience** - Clear abstractions, utilities, and helpers following established patterns

---

## 📊 1. Data Structure & Types

### Type-Safe Pricing Model System

```typescript
// lib/types/selling-rates.ts

// Rate basis enum - standardize what we allow
export const RATE_BASIS = {
  PER_NIGHT: "per_night",
  PER_PERSON: "per_person",
  PER_ITEM: "per_item",
  PER_BOOKING: "per_booking",
  FLAT_RATE: "flat_rate",
} as const

export type RateBasis = typeof RATE_BASIS[keyof typeof RATE_BASIS]

// Pricing model enum
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
} as const

export type PricingModel = typeof PRICING_MODEL[keyof typeof PRICING_MODEL]

// Markup types
export const MARKUP_TYPE = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
} as const

export type MarkupType = typeof MARKUP_TYPE[keyof typeof MARKUP_TYPE]

// Type-safe pricing details for each model
export interface StandardPricingDetails {
  // No special fields needed
}

export interface ExtraNightPricingDetails {
  min_nights: number
  max_nights?: number
}

export interface WeekendPricingDetails {
  valid_day_mask: {
    friday?: boolean
    saturday?: boolean
    sunday?: boolean
  }
  uplift_percentage?: number // Optional override
}

export interface PerPersonPricingDetails {
  pricing_tiers: Array<{
    min_pax: number
    max_pax?: number
    price: number
  }>
  base_pax?: number // Minimum pax for booking
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
  season_months: number[] // 1-12
  blackout_dates?: string[] // ISO dates
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

// Main selling rate type
export interface SellingRate {
  id: string
  organization_id: string
  product_id: string
  product_option_id: string | null
  rate_name: string | null
  rate_basis: RateBasis
  pricing_model: PricingModel
  valid_from: Date
  valid_to: Date
  base_price: number
  currency: string
  markup_type: MarkupType | null
  markup_amount: number | null
  pricing_details: PricingDetails
  is_active: boolean
  target_cost: number | null
  created_at: Date
  updated_at: Date
}

// Helper type guard functions
export function isExtraNightPricing(
  details: PricingDetails
): details is ExtraNightPricingDetails {
  return "min_nights" in details
}

export function isWeekendPricing(
  details: PricingDetails
): details is WeekendPricingDetails {
  return "valid_day_mask" in details
}

// ... etc for each model
```

---

## 🏗️ 2. Schema Improvements

### Recommended Database Enhancements

```sql
-- Add check constraints for rate_basis
ALTER TABLE selling_rates 
ADD CONSTRAINT check_rate_basis 
CHECK (rate_basis IN ('per_night', 'per_person', 'per_item', 'per_booking', 'flat_rate'));

-- Add check constraints for pricing_model
ALTER TABLE selling_rates 
ADD CONSTRAINT check_pricing_model 
CHECK (pricing_model IN (
  'standard', 'extra_night', 'weekend', 'per_person', 
  'tiered', 'pass_type', 'seasonal', 'early_bird', 'last_minute'
));

-- Add check constraints for markup_type
ALTER TABLE selling_rates 
ADD CONSTRAINT check_markup_type 
CHECK (markup_type IS NULL OR markup_type IN ('percentage', 'fixed'));

-- Add index for date range queries (critical for rate lookup)
CREATE INDEX idx_selling_rates_valid_dates 
ON selling_rates (product_option_id, valid_from, valid_to) 
WHERE is_active = true;

-- Add index for pricing model filtering
CREATE INDEX idx_selling_rates_pricing_model 
ON selling_rates (pricing_model, is_active);

-- Add computed column for final price (or make it a view/function)
-- This helps with queries that need to calculate final price
```

---

## 🎨 3. UI/UX Structure

### Smart Form Builder System (Inspired by Product Option Attributes)

Following the same pattern as `ProductOptionAttributeEditor`, we create dynamic forms that switch based on `pricing_model`:

```typescript
// components/selling-rates/pricing-details-editor.tsx

import { useFormContext, Controller } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TagInput } from "@/components/ui/tag-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { OptionSection } from "@/components/products/shared/option-section"

type SellingRateFormValues = {
  rate_name: string | null
  rate_basis: RateBasis
  pricing_model: PricingModel
  valid_from: Date
  valid_to: Date
  base_price: number
  currency: string
  markup_type: MarkupType | null
  markup_amount: number | null
  pricing_details: PricingDetails
  target_cost: number | null
  is_active: boolean
}

type PricingDetailsEditorProps = {
  pricingModel: PricingModel
}

export function PricingDetailsEditor({ pricingModel }: PricingDetailsEditorProps) {
  const editor = useMemo(() => {
    switch (pricingModel) {
      case PRICING_MODEL.STANDARD:
        return <StandardPricingFields />
      case PRICING_MODEL.EXTRA_NIGHT:
        return <ExtraNightPricingFields />
      case PRICING_MODEL.WEEKEND:
        return <WeekendPricingFields />
      case PRICING_MODEL.PER_PERSON:
        return <PerPersonPricingFields />
      case PRICING_MODEL.TIERED:
        return <TieredPricingFields />
      case PRICING_MODEL.PASS_TYPE:
        return <PassTypePricingFields />
      case PRICING_MODEL.SEASONAL:
        return <SeasonalPricingFields />
      case PRICING_MODEL.EARLY_BIRD:
        return <EarlyBirdPricingFields />
      case PRICING_MODEL.LAST_MINUTE:
        return <LastMinutePricingFields />
      default:
        return <RawPricingDetailsFallback />
    }
  }, [pricingModel])

  if (!editor) {
    return <RawPricingDetailsFallback />
  }

  return (
    <div className="space-y-6">
      {editor}
      <AdvancedPricingDetailsEditor />
    </div>
  )
}

// Example: Extra Night Pricing Form (Following Occupancy Pattern)
function ExtraNightPricingFields() {
  const { control, setValue, watch } = useFormContext<SellingRateFormValues>()
  
  const pricingDetails = watch("pricing_details")
  
  useEffect(() => {
    // Initialize if missing (same pattern as occupancy)
    if (!pricingDetails || typeof pricingDetails !== "object") {
      setValue("pricing_details", { min_nights: 1, max_nights: undefined })
      return
    }

    const { min_nights, max_nights } = pricingDetails
    
    // Normalize: ensure min_nights >= 1, and if max_nights exists, max_nights >= min_nights
    const safeMin = Math.max(1, Number(min_nights) || 1)
    let safeMax = max_nights !== undefined 
      ? Math.max(safeMin, Number(max_nights) || safeMin) 
      : undefined

    // Auto-correct if constraints violated (like occupancy does with standard)
    if (max_nights !== undefined && Number(max_nights) < safeMin) {
      safeMax = safeMin
    }
    
    // Only update if values changed (same as occupancy pattern)
    if (safeMin !== min_nights || safeMax !== max_nights) {
      setValue("pricing_details", { 
        ...pricingDetails,
        min_nights: safeMin, 
        max_nights: safeMax 
      }, { shouldDirty: false }) // Don't mark form dirty for auto-corrections
    }
  }, [pricingDetails, setValue])

  return (
    <OptionSection
      title="Extra Night Configuration"
      description="Define when this rate applies (nights beyond standard length)."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="pricing_details.min_nights"
          render={({ field }) => (
            <NumberInputField
              label="Minimum nights"
              description="Rate applies when stay is at least this many nights"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="pricing_details.max_nights"
          render={({ field }) => (
            <NumberInputField
              label="Maximum nights (optional)"
              description="Rate applies up to this many nights (leave empty for no limit)"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </OptionSection>
  )
}

// Example: Weekend Pricing Form
function WeekendPricingFields() {
  const { control, setValue, watch } = useFormContext<SellingRateFormValues>()
  
  const dayMask = watch("pricing_details.valid_day_mask")
  
  useEffect(() => {
    if (!dayMask || typeof dayMask !== "object") {
      const defaultMask: Record<string, boolean> = {}
      daysOfWeek.forEach((day) => {
        defaultMask[day] = false
      })
      setValue("pricing_details.valid_day_mask", defaultMask)
    }
  }, [dayMask, setValue])

  return (
    <OptionSection
      title="Weekend Configuration"
      description="Define which days this rate applies and optional uplift percentage."
    >
      <DayMaskField
        control={control}
        namePrefix="pricing_details.valid_day_mask"
        label="Valid days"
      />
      
      <Controller
        control={control}
        name="pricing_details.uplift_percentage"
        render={({ field }) => (
          <NumberInputField
            label="Uplift percentage (optional)"
            description="Additional percentage to apply on top of base price (e.g., 10 for 10% uplift)"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </OptionSection>
  )
}

// Example: Per Person Pricing Form (With Tier Validation)
function PerPersonPricingFields() {
  const { control, setValue, watch } = useFormContext<SellingRateFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricing_details.pricing_tiers"
  })

  const pricingTiers = watch("pricing_details.pricing_tiers")
  
  // Normalize tiers to ensure proper ordering and no overlaps (similar to occupancy logic)
  useEffect(() => {
    if (!Array.isArray(pricingTiers)) {
      setValue("pricing_details.pricing_tiers", [])
      return
    }

    // Ensure each tier has valid min_pax <= max_pax (or max_pax is undefined for "and above")
    const normalizedTiers = pricingTiers.map((tier, index) => {
      const minPax = Math.max(1, Number(tier.min_pax) || 1)
      const maxPax = tier.max_pax !== undefined 
        ? Math.max(minPax, Number(tier.max_pax) || minPax)
        : undefined
      const price = Math.max(0, Number(tier.price) || 0)
      
      return { min_pax: minPax, max_pax: maxPax, price }
    }).sort((a, b) => a.min_pax - b.min_pax) // Sort by min_pax ascending

    // Check if normalization needed
    const needsUpdate = pricingTiers.some((tier, i) => {
      const normalized = normalizedTiers[i]
      return tier.min_pax !== normalized.min_pax || 
             tier.max_pax !== normalized.max_pax ||
             tier.price !== normalized.price
    })

    if (needsUpdate || pricingTiers.length !== normalizedTiers.length) {
      setValue("pricing_details.pricing_tiers", normalizedTiers, { shouldDirty: false })
    }
  }, [pricingTiers, setValue])

  return (
    <OptionSection
      title="Per Person Pricing Tiers"
      description="Define price tiers based on number of people."
    >
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border bg-muted/40 p-3 md:grid-cols-[minmax(0,120px)_minmax(0,120px)_minmax(0,140px)_auto] md:items-center"
          >
            <Controller
              control={control}
              name={`pricing_details.pricing_tiers.${index}.min_pax`}
              render={({ field }) => (
                <NumberInputField label="Min pax" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.pricing_tiers.${index}.max_pax`}
              render={({ field }) => (
                <NumberInputField label="Max pax" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.pricing_tiers.${index}.price`}
              render={({ field }) => (
                <NumberInputField label="Price per person" value={field.value} onChange={field.onChange} />
              )}
            />
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ min_pax: 1, max_pax: undefined, price: 0 })}
        >
          Add tier
        </Button>
      </div>
      
      <Controller
        control={control}
        name="pricing_details.base_pax"
        render={({ field }) => (
          <NumberInputField
            label="Base pax (optional)"
            description="Minimum number of people required for booking"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </OptionSection>
  )
}

// Reusable Field Components (same pattern as product options)
function NumberInputField({ label, description, value, onChange }: {
  label: string
  description?: string
  value: any
  onChange: (value: any) => void
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <Input
        type="number"
        value={value ?? ""}
        onChange={(event) => {
          const numeric = event.target.value
          onChange(numeric === "" ? undefined : Number(numeric))
        }}
      />
    </div>
  )
}

function DayMaskField({ control, namePrefix, label }: {
  control: any
  namePrefix: string
  label: string
}) {
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {daysOfWeek.map((day) => (
          <Controller
            key={day}
            control={control}
            name={`${namePrefix}.${day}`}
            render={({ field }) => (
              <label className="flex flex-wrap items-center gap-1 text-xs capitalize">
                <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                {day}
              </label>
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Fallback for unknown/unsupported pricing models
function RawPricingDetailsFallback() {
  const { watch, setValue } = useFormContext<SellingRateFormValues>()
  const pricingDetails = watch("pricing_details")
  const [raw, setRaw] = useState(() => JSON.stringify(pricingDetails ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(JSON.stringify(pricingDetails ?? {}, null, 2))
  }, [pricingDetails])

  const handleApply = () => {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {}
      setValue("pricing_details", parsed)
      setError(null)
    } catch (err) {
      setError("Invalid JSON")
    }
  }

  return (
    <OptionSection
      title="Pricing Details"
      description="Enter raw JSON for pricing details when no guided editor is available."
    >
      <Textarea rows={12} value={raw} onChange={(event) => setRaw(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleApply}>
          Apply JSON
        </Button>
      </div>
    </OptionSection>
  )
}

// Advanced JSON editor (always available as fallback)
function AdvancedPricingDetailsEditor() {
  const { watch, setValue } = useFormContext<SellingRateFormValues>()
  const pricingDetails = watch("pricing_details")
  const [raw, setRaw] = useState(() => JSON.stringify(pricingDetails ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(JSON.stringify(pricingDetails ?? {}, null, 2))
  }, [pricingDetails])

  const handleApply = () => {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {}
      setValue("pricing_details", parsed)
      setError(null)
    } catch (err) {
      setError("Invalid JSON")
    }
  }

  return (
    <details className="rounded-lg border bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-medium">Advanced JSON editor</summary>
      <div className="mt-3 space-y-2">
        <Textarea rows={10} value={raw} onChange={(event) => setRaw(event.target.value)} />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleApply}>
            Apply JSON
          </Button>
        </div>
      </div>
    </details>
  )
}
```

### Enhanced Rate Management Sheet

Key improvements:
1. **Visual Timeline** - Show overlapping rate validity periods
2. **Conflict Detection** - Highlight overlapping rates for same date range
3. **Status Filtering** - Active/Inactive/Expired/Upcoming tabs
4. **Quick Actions** - Inline status toggle, quick duplicate
5. **Smart Defaults** - Suggest pricing model based on product type
6. **Validation Warnings** - Show issues before save (overlaps, gaps, etc.)

### Rate Basis Selector

Replace free-text input with intelligent dropdown:

```typescript
// components/selling-rates/rate-basis-selector.tsx
const RATE_BASIS_OPTIONS = [
  {
    value: RATE_BASIS.PER_NIGHT,
    label: "Per night",
    icon: Calendar,
    description: "Price per night of stay",
    compatibleModels: [PRICING_MODEL.STANDARD, PRICING_MODEL.EXTRA_NIGHT, PRICING_MODEL.WEEKEND],
  },
  {
    value: RATE_BASIS.PER_PERSON,
    label: "Per person",
    icon: Users,
    description: "Price per person",
    compatibleModels: [PRICING_MODEL.STANDARD, PRICING_MODEL.PER_PERSON, PRICING_MODEL.TIERED],
  },
  // ... etc
]
```

---

## 🔧 4. Business Logic & Utilities

### Rate Calculation Utilities

```typescript
// lib/utils/selling-rates/calculate.ts

/**
 * Calculate final price for a booking scenario
 */
export function calculateRatePrice(
  rate: SellingRate,
  context: {
    nights?: number
    people?: number
    bookingDate: Date
    travelDate: Date
    quantity?: number
  }
): number {
  let basePrice = rate.base_price

  // Apply pricing model logic
  switch (rate.pricing_model) {
    case PRICING_MODEL.EXTRA_NIGHT:
      const extraNightDetails = rate.pricing_details as ExtraNightPricingDetails
      if (context.nights && context.nights >= extraNightDetails.min_nights) {
        // Apply extra night pricing
      }
      break

    case PRICING_MODEL.PER_PERSON:
      const perPersonDetails = rate.pricing_details as PerPersonPricingDetails
      if (context.people) {
        // Find tier, calculate based on people count
        basePrice = findTierPrice(perPersonDetails.pricing_tiers, context.people)
      }
      break

    case PRICING_MODEL.WEEKEND:
      // Check if travel date is weekend
      if (isWeekend(context.travelDate)) {
        basePrice *= 1 + (extraNightDetails.uplift_percentage ?? 0.1)
      }
      break

    // ... etc for all models
  }

  // Apply markup
  if (rate.markup_type && rate.markup_amount) {
    if (rate.markup_type === MARKUP_TYPE.PERCENTAGE) {
      basePrice *= 1 + rate.markup_amount / 100
    } else {
      basePrice += rate.markup_amount
    }
  }

  return Math.round(basePrice * 100) / 100 // Round to 2 decimals
}
```

### Rate Selection Logic

```typescript
// lib/utils/selling-rates/select.ts

/**
 * Find applicable rates for a booking scenario
 * Returns rates ordered by priority (specificity, then date)
 */
export function findApplicableRates(
  rates: SellingRate[],
  context: BookingContext
): SellingRate[] {
  const now = new Date()

  return rates
    .filter((rate) => {
      // Active check
      if (!rate.is_active) return false

      // Date validity
      if (context.travelDate < rate.valid_from || context.travelDate > rate.valid_to) {
        return false
      }

      // Model-specific validation
      return validateRateContext(rate, context)
    })
    .sort((a, b) => {
      // Sort by specificity (most specific first)
      const aSpecificity = getRateSpecificity(a)
      const bSpecificity = getRateSpecificity(b)

      if (aSpecificity !== bSpecificity) {
        return bSpecificity - aSpecificity
      }

      // Then by valid_from (most recent first)
      return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
    })
}
```

### Conflict Detection

```typescript
// lib/utils/selling-rates/conflicts.ts

export interface RateConflict {
  type: "overlap" | "gap" | "duplicate"
  rates: SellingRate[]
  dateRange: { from: Date; to: Date }
  severity: "warning" | "error"
  message: string
}

export function detectRateConflicts(
  rates: SellingRate[],
  optionId: string
): RateConflict[] {
  const conflicts: RateConflict[] = []

  // Filter rates for this option
  const optionRates = rates.filter((r) => r.product_option_id === optionId)

  // Check for overlaps
  for (let i = 0; i < optionRates.length; i++) {
    for (let j = i + 1; j < optionRates.length; j++) {
      const overlap = findDateOverlap(optionRates[i], optionRates[j])
      if (overlap) {
        conflicts.push({
          type: "overlap",
          rates: [optionRates[i], optionRates[j]],
          dateRange: overlap,
          severity: "warning",
          message: `Overlapping rates: "${optionRates[i].rate_name || 'Unnamed'}" and "${optionRates[j].rate_name || 'Unnamed'}"`,
        })
      }
    }
  }

  // Check for gaps in coverage
  // ... logic to find gaps in date ranges

  return conflicts
}
```

---

## 📚 5. Constants & Configuration

```typescript
// lib/constants/selling-rates.ts

export const SELLING_RATES_CONFIG = {
  // Default currency
  DEFAULT_CURRENCY: "USD",

  // Supported currencies
  SUPPORTED_CURRENCIES: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const,

  // Rate basis options with metadata
  RATE_BASIS_OPTIONS: [
    {
      value: "per_night",
      label: "Per Night",
      description: "Price charged per night of accommodation",
      icon: "Calendar",
    },
    {
      value: "per_person",
      label: "Per Person",
      description: "Price charged per person",
      icon: "Users",
    },
    // ... etc
  ] as const,

  // Pricing model metadata
  PRICING_MODEL_INFO: {
    standard: {
      label: "Standard Rate",
      description: "Default pricing with no special conditions",
      icon: "Circle",
      color: "blue",
    },
    extra_night: {
      label: "Extra Night",
      description: "Applies to stays beyond standard length",
      icon: "Moon",
      color: "purple",
    },
    // ... etc
  } as const,

  // Validation rules
  VALIDATION: {
    MIN_BASE_PRICE: 0,
    MAX_BASE_PRICE: 999999.99,
    MIN_VALIDITY_DAYS: 1,
    MAX_VALIDITY_DAYS: 365 * 5, // 5 years max
    MARKUP_PERCENTAGE_MAX: 1000, // 1000% max markup
  },
}
```

---

## 🎯 6. Enhanced Form Components

### Main Selling Rate Dialog (Using react-hook-form Pattern)

Following the same pattern as `ProductOptionDialog`, integrate everything into a single dialog:

```typescript
// components/selling-rates/selling-rate-dialog.tsx

"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSellingRate, updateSellingRate } from "@/lib/actions/selling-rates"
import type { SellingRateDetails } from "@/lib/data/products"
import { PricingDetailsEditor } from "@/components/selling-rates/pricing-details-editor"
import { RATE_BASIS, PRICING_MODEL, MARKUP_TYPE } from "@/lib/types/selling-rates"

const formSchema = z.object({
  product_id: z.string().uuid(),
  product_option_id: z.string().uuid().nullable().optional(),
  rate_name: z.string().trim().optional().nullable(),
  rate_basis: z.enum([RATE_BASIS.PER_NIGHT, RATE_BASIS.PER_PERSON, RATE_BASIS.PER_ITEM, RATE_BASIS.PER_BOOKING, RATE_BASIS.FLAT_RATE]),
  pricing_model: z.enum([...Object.values(PRICING_MODEL)] as [string, ...string[]]),
  valid_from: z.date({ required_error: "Start date is required" }),
  valid_to: z.date({ required_error: "End date is required" }),
  base_price: z.coerce.number({ required_error: "Base price is required" }).min(0),
  currency: z.string().trim().length(3, "Currency needs 3 letters").transform((value) => value.toUpperCase()),
  markup_type: z.enum([MARKUP_TYPE.PERCENTAGE, MARKUP_TYPE.FIXED]).optional().nullable(),
  markup_amount: z.coerce.number().optional().nullable(),
  pricing_details: z.any().optional(), // Validated per pricing model
  target_cost: z.coerce.number().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

type SellingRateFormValues = z.infer<typeof formSchema>

type SellingRateDialogProps = {
  productId: string
  optionId: string | null
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  rate?: SellingRateDetails
}

export function SellingRateDialog({ productId, optionId, mode, open, onOpenChange, rate }: SellingRateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultValues = useMemo<SellingRateFormValues>(() => {
    if (!rate) {
      return {
        product_id: productId,
        product_option_id: optionId ?? null,
        rate_name: "",
        rate_basis: RATE_BASIS.PER_NIGHT,
        pricing_model: PRICING_MODEL.STANDARD,
        valid_from: new Date(),
        valid_to: new Date(),
        base_price: 0,
        currency: "USD",
        markup_type: undefined,
        markup_amount: undefined,
        pricing_details: {},
        target_cost: undefined,
        is_active: true,
      }
    }

    const { valid_from, valid_to, pricing_details, currency, markup_type, markup_amount, target_cost } = rate
    return {
      product_id: productId,
      product_option_id: rate.option_id ?? null,
      rate_name: rate.rate_name ?? "",
      rate_basis: rate.rate_basis as RateBasis,
      pricing_model: rate.pricing_model as PricingModel,
      valid_from: new Date(valid_from),
      valid_to: new Date(valid_to),
      base_price: rate.base_price,
      currency,
      markup_type: (markup_type as MarkupType) ?? undefined,
      markup_amount: markup_amount ?? undefined,
      pricing_details: pricing_details ?? {},
      target_cost: target_cost ?? undefined,
      is_active: rate.is_active,
    }
  }, [productId, optionId, rate])

  const methods = useForm<SellingRateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      methods.reset(defaultValues)
    }
  }, [defaultValues, methods, open])

  const selectedPricingModel = methods.watch("pricing_model")

  const title = mode === "create" ? "New selling rate" : `Edit ${rate?.rate_name ?? "selling rate"}`
  const description = mode === "create" 
    ? "Define pricing for this product option." 
    : "Update selling rate details."

  const handleSubmitForm = methods.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          product_option_id: optionId ?? null,
          valid_from: format(values.valid_from, "yyyy-MM-dd"),
          valid_to: format(values.valid_to, "yyyy-MM-dd"),
          pricing_details: values.pricing_details,
        }

        if (mode === "create") {
          await createSellingRate(payload)
          toast.success("Selling rate created")
        } else if (rate) {
          await updateSellingRate(rate.id, payload)
          toast.success("Selling rate updated")
        }

        router.refresh()
        onOpenChange(false)
      } catch (error) {
        toast.error("Failed to save selling rate", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form id="selling-rate-form" className="space-y-6" onSubmit={handleSubmitForm}>
            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rate_name">Rate name</Label>
                <Input id="rate_name" placeholder="e.g. Standard nightly" {...methods.register("rate_name")} />
              </div>
              <Controller
                name="rate_basis"
                control={methods.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <Label>Rate basis</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select basis" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RATE_BASIS_OPTIONS).map(([key, option]) => (
                          <SelectItem key={key} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="pricing_model"
                control={methods.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <Label>Pricing model</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRICING_MODEL_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input maxLength={3} {...methods.register("currency")} />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="base_price">Base price</Label>
                <Input 
                  id="base_price" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  {...methods.register("base_price", { valueAsNumber: true })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target_cost">Target cost</Label>
                <Input
                  id="target_cost"
                  type="number"
                  step="0.01"
                  {...methods.register("target_cost", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="markup_type"
                control={methods.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <Label>Markup type</Label>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value={MARKUP_TYPE.PERCENTAGE}>Percentage</SelectItem>
                        <SelectItem value={MARKUP_TYPE.FIXED}>Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <div className="grid gap-2">
                <Label htmlFor="markup_amount">Markup amount</Label>
                <Input
                  id="markup_amount"
                  type="number"
                  step="0.01"
                  {...methods.register("markup_amount", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Validity Period */}
            <Controller
              name="valid_from"
              control={methods.control}
              render={() => {
                const range = {
                  from: methods.watch("valid_from"),
                  to: methods.watch("valid_to"),
                }

                return (
                  <div className="grid gap-2">
                    <Label>Validity window</Label>
                    <DateRangePicker
                      initialDateFrom={range.from}
                      initialDateTo={range.to}
                      onUpdate={({ range }) => {
                        if (range?.from) methods.setValue("valid_from", range.from)
                        if (range?.to) methods.setValue("valid_to", range.to)
                      }}
                      align="start"
                    />
                  </div>
                )
              }}
            />

            {/* Model-Specific Pricing Details - THE KEY DIFFERENCE! */}
            <PricingDetailsEditor pricingModel={selectedPricingModel} />

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive rates stay hidden from booking flows.</p>
              </div>
              <Switch 
                checked={methods.watch("is_active") ?? true} 
                onCheckedChange={(checked) => methods.setValue("is_active", checked)} 
              />
            </div>
          </form>
        </FormProvider>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="selling-rate-form" disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create rate" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🔍 7. Data Layer Improvements

### Enhanced Server Actions

```typescript
// lib/actions/selling-rates.ts (enhanced)

// Add validation for pricing_details based on pricing_model
function validatePricingDetails(
  model: PricingModel,
  details: any
): PricingDetails {
  const schema = getPricingDetailsSchema(model)
  const result = schema.safeParse(details)
  
  if (!result.success) {
    throw new Error(`Invalid pricing details for ${model}: ${result.error.message}`)
  }
  
  return result.data
}

// Add conflict checking before create/update
export async function createSellingRate(values: SellingRateInput) {
  // ... existing validation
  
  // Check for conflicts
  const conflicts = await detectConflictsForRate(values)
  if (conflicts.some(c => c.severity === "error")) {
    throw new Error("Cannot create rate: conflicts detected")
  }
  
  // ... rest of creation logic
}

// Add bulk operations
export async function bulkUpdateRates(rateIds: string[], updates: Partial<SellingRateInput>) {
  // Validate all updates
  // Check conflicts
  // Update in transaction
  // Log audit trail
}

// Add rate duplication with smart date shifting
export async function duplicateRateWithDateShift(
  rateId: string,
  dateShift: number // days to shift
) {
  // Duplicate rate but shift valid_from and valid_to
}
```

---

## 📊 8. Visual Improvements

### Rate Timeline View

```typescript
// components/selling-rates/rate-timeline.tsx

// Visual timeline showing:
// - All rates for an option on a calendar view
// - Color-coded by pricing model
// - Highlights for conflicts
// - Shows gaps in coverage
// - Interactive: click to edit, drag to adjust dates
```

### Rate Comparison Table

```typescript
// components/selling-rates/rate-comparison.tsx

// Side-by-side comparison of multiple rates
// Shows differences highlighted
// Useful for duplicate/similar rates
```

---

## 🎓 9. Documentation & Helpers

### Type Guards & Validators

```typescript
// lib/utils/selling-rates/validators.ts

export function validateRateBasis(basis: string): basis is RateBasis {
  return Object.values(RATE_BASIS).includes(basis as RateBasis)
}

export function validatePricingModel(model: string): model is PricingModel {
  return Object.values(PRICING_MODEL).includes(model as PricingModel)
}

export function validateSellingRate(rate: any): rate is SellingRate {
  // Comprehensive validation
}
```

### Helper Functions

```typescript
// lib/utils/selling-rates/helpers.ts

export function formatRateDisplay(rate: SellingRate): string {
  return `${rate.currency} ${rate.base_price.toFixed(2)} ${rate.rate_basis.replace('_', ' ')}`
}

export function getRateStatus(rate: SellingRate): "active" | "inactive" | "expired" | "upcoming" {
  const now = new Date()
  if (!rate.is_active) return "inactive"
  if (now > new Date(rate.valid_to)) return "expired"
  if (now < new Date(rate.valid_from)) return "upcoming"
  return "active"
}

export function calculateMarkupPrice(rate: SellingRate): number {
  // Calculate final price with markup applied
}
```

---

## 🚀 10. Migration Path

### Phase 1: Type Safety (Foundation)
1. Create type system with enums and interfaces
2. Add type guards and validators
3. Update existing code to use types

### Phase 2: Enhanced UI
1. Replace JSON textarea with smart forms
2. Add rate basis selector
3. Improve sheet UI with filtering and status management

### Phase 3: Business Logic
1. Add conflict detection
2. Add rate calculation utilities
3. Add rate selection logic

### Phase 4: Advanced Features
1. Timeline view
2. Bulk operations
3. Rate comparison tools

---

## ✅ Summary: What Makes It "Perfect"

1. **Type Safety** - Full TypeScript coverage with discriminated unions
2. **Extensibility** - Easy to add new pricing models without breaking changes
3. **User Experience** - Smart forms that guide users, not raw JSON
4. **Validation** - Comprehensive validation at all levels
5. **Conflict Management** - Proactive conflict detection and warnings
6. **Business Intelligence** - Built-in calculation and selection utilities
7. **Developer Experience** - Clear abstractions, utilities, and helpers
8. **Visual Feedback** - Timeline views, conflict highlights, status indicators
9. **Documentation** - Comprehensive type definitions and usage examples
10. **Performance** - Proper indexing and efficient queries

This structure provides a solid foundation that scales with your business needs while maintaining code quality and user experience.

