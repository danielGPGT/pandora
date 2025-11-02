/**
 * Dynamic Pricing Details Editor
 * 
 * Follows the same pattern as ProductOptionAttributeEditor
 * Renders different form fields based on pricing_model selection
 */

"use client"

import { useMemo, useEffect, useState } from "react"
import { useFormContext, Controller, useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { PRICING_MODEL } from "@/lib/types/selling-rates"
import { OptionSection, NumberInputField, DayMaskField } from "@/components/products/shared/pricing-field-components"
import { TagInput } from "@/components/ui/tag-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type PricingDetailsEditorProps = {
  pricingModel: string
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
      case PRICING_MODEL.OCCUPANCY_BASED:
        return <OccupancyBasedPricingFields />
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

// ============================================================================
// Standard Pricing Fields (no special fields needed)
// ============================================================================

function StandardPricingFields() {
  return (
    <OptionSection
      title="Standard Rate Configuration"
      description="No additional configuration needed for standard rates."
    >
      <p className="text-xs text-muted-foreground">
        Standard rates use the base price with no special conditions. Use other pricing models for seasonal pricing, discounts, or special conditions.
      </p>
    </OptionSection>
  )
}

// ============================================================================
// Extra Night Pricing Fields (Following Occupancy Pattern)
// ============================================================================

function ExtraNightPricingFields() {
  const { control, setValue, watch } = useFormContext()
  
  const pricingDetails = watch("pricing_details")
  
  useEffect(() => {
    // Initialize if missing (same pattern as occupancy)
    if (!pricingDetails || typeof pricingDetails !== "object") {
      setValue("pricing_details", { min_nights: 1, max_nights: undefined }, { shouldDirty: false })
      return
    }

    const { min_nights, max_nights } = pricingDetails
    
    // Normalize: ensure min_nights >= 1, and if max_nights exists, max_nights >= min_nights
    const safeMin = Math.max(1, Number(min_nights) || 1)
    let safeMax = max_nights !== undefined 
      ? Math.max(safeMin, Number(max_nights) || safeMin) 
      : undefined

    // Auto-correct if constraints violated
    if (max_nights !== undefined && Number(max_nights) < safeMin) {
      safeMax = safeMin
    }
    
    // Only update if values changed
    if (safeMin !== min_nights || safeMax !== max_nights) {
      setValue("pricing_details", { 
        ...pricingDetails,
        min_nights: safeMin, 
        max_nights: safeMax 
      }, { shouldDirty: false })
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
              min={1}
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
              min={1}
            />
          )}
        />
      </div>
    </OptionSection>
  )
}

// ============================================================================
// Weekend Pricing Fields
// ============================================================================

function WeekendPricingFields() {
  const { control, setValue, watch } = useFormContext()
  
  const dayMask = watch("pricing_details.valid_day_mask")
  
  useEffect(() => {
    if (!dayMask || typeof dayMask !== "object") {
      const defaultMask: Record<string, boolean> = {}
      const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      daysOfWeek.forEach((day) => {
        defaultMask[day] = false
      })
      setValue("pricing_details.valid_day_mask", defaultMask, { shouldDirty: false })
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
            min={0}
            max={100}
            step={0.1}
          />
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Per Person Pricing Fields (With Tier Validation)
// ============================================================================

function PerPersonPricingFields() {
  const { control, setValue, watch } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricing_details.pricing_tiers"
  })

  const pricingTiers = watch("pricing_details.pricing_tiers")
  
  // Normalize tiers to ensure proper ordering (similar to occupancy logic)
  useEffect(() => {
    if (!Array.isArray(pricingTiers)) {
      setValue("pricing_details.pricing_tiers", [], { shouldDirty: false })
      return
    }

    // Ensure each tier has valid min_pax <= max_pax (or max_pax is undefined)
    const normalizedTiers = pricingTiers.map((tier) => {
      const minPax = Math.max(1, Number(tier?.min_pax) || 1)
      const maxPax = tier?.max_pax !== undefined 
        ? Math.max(minPax, Number(tier.max_pax) || minPax)
        : undefined
      const price = Math.max(0, Number(tier?.price) || 0)
      
      return { min_pax: minPax, max_pax: maxPax, price }
    }).sort((a, b) => a.min_pax - b.min_pax) // Sort by min_pax ascending

    // Check if normalization needed
    const needsUpdate = pricingTiers.some((tier, i) => {
      const normalized = normalizedTiers[i]
      if (!normalized) return true
      return tier?.min_pax !== normalized.min_pax || 
             tier?.max_pax !== normalized.max_pax ||
             tier?.price !== normalized.price
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
                <NumberInputField label="Min pax" value={field.value} onChange={field.onChange} min={1} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.pricing_tiers.${index}.max_pax`}
              render={({ field }) => (
                <NumberInputField label="Max pax" value={field.value} onChange={field.onChange} min={1} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.pricing_tiers.${index}.price`}
              render={({ field }) => (
                <NumberInputField label="Price per person" value={field.value} onChange={field.onChange} min={0} step={0.01} />
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
            min={1}
          />
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Tiered Pricing Fields
// ============================================================================

function TieredPricingFields() {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pricing_details.tiers"
  })

  return (
    <OptionSection
      title="Tiered Pricing Configuration"
      description="Define price tiers based on quantity, nights, or people."
    >
      <Controller
        control={control}
        name="pricing_details.quantity_type"
        render={({ field }) => (
          <div className="grid gap-1">
            <Label className="text-xs uppercase text-muted-foreground">Quantity type</Label>
            <Select value={field.value ?? "nights"} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nights">Nights</SelectItem>
                <SelectItem value="units">Units</SelectItem>
                <SelectItem value="people">People</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border bg-muted/40 p-3 md:grid-cols-[minmax(0,120px)_minmax(0,120px)_minmax(0,140px)_minmax(0,200px)_auto] md:items-center"
          >
            <Controller
              control={control}
              name={`pricing_details.tiers.${index}.min_quantity`}
              render={({ field }) => (
                <NumberInputField label="Min quantity" value={field.value} onChange={field.onChange} min={0} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.tiers.${index}.max_quantity`}
              render={({ field }) => (
                <NumberInputField label="Max quantity" value={field.value} onChange={field.onChange} min={0} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.tiers.${index}.price`}
              render={({ field }) => (
                <NumberInputField label="Price" value={field.value} onChange={field.onChange} min={0} step={0.01} />
              )}
            />
            <Controller
              control={control}
              name={`pricing_details.tiers.${index}.description`}
              render={({ field }) => (
                <div className="grid gap-1">
                  <Label className="text-xs uppercase text-muted-foreground">Description</Label>
                  <Input
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                    placeholder="Optional description"
                  />
                </div>
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
          onClick={() => append({ min_quantity: undefined, max_quantity: undefined, price: 0, description: undefined })}
        >
          Add tier
        </Button>
      </div>
    </OptionSection>
  )
}

// ============================================================================
// Pass Type Pricing Fields
// ============================================================================

function PassTypePricingFields() {
  const { control, setValue, watch } = useFormContext()
  
  const accessLevels = watch("pricing_details.access_level")
  
  useEffect(() => {
    if (!Array.isArray(accessLevels)) {
      setValue("pricing_details.access_level", [], { shouldDirty: false })
    }
  }, [accessLevels, setValue])

  return (
    <OptionSection
      title="Pass Type Configuration"
      description="Define pass type, access levels, and validity period."
    >
      <Controller
        control={control}
        name="pricing_details.pass_type"
        render={({ field }) => (
          <div className="grid gap-1">
            <Label className="text-xs uppercase text-muted-foreground">Pass type</Label>
            <Input
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder="e.g., single_day, multi_day, vip"
            />
          </div>
        )}
      />

      <Controller
        control={control}
        name="pricing_details.access_level"
        render={({ field }) => (
          <div className="grid gap-1">
            <Label className="text-xs uppercase text-muted-foreground">Access levels</Label>
            <TagInput
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              placeholder="e.g., vip_lounge, backstage"
            />
          </div>
        )}
      />

      <Controller
        control={control}
        name="pricing_details.validity_days"
        render={({ field }) => (
          <NumberInputField
            label="Validity days (optional)"
            description="Number of days the pass is valid for"
            value={field.value}
            onChange={field.onChange}
            min={1}
          />
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Seasonal Pricing Fields
// ============================================================================

function SeasonalPricingFields() {
  const { control, setValue, watch } = useFormContext()
  
  const seasonMonths = watch("pricing_details.season_months")
  const blackoutDates = watch("pricing_details.blackout_dates")
  
  useEffect(() => {
    if (!Array.isArray(seasonMonths)) {
      setValue("pricing_details.season_months", [], { shouldDirty: false })
    }
  }, [seasonMonths, setValue])

  useEffect(() => {
    if (!Array.isArray(blackoutDates)) {
      setValue("pricing_details.blackout_dates", [], { shouldDirty: false })
    }
  }, [blackoutDates, setValue])

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ]

  return (
    <OptionSection
      title="Seasonal Configuration"
      description="Define season name, applicable months, and blackout dates."
    >
      <Controller
        control={control}
        name="pricing_details.season_name"
        render={({ field }) => (
          <div className="grid gap-1">
            <Label className="text-xs uppercase text-muted-foreground">Season name</Label>
            <Input
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder="e.g., Summer, Peak Season, Low Season"
            />
          </div>
        )}
      />

      <div className="grid gap-1">
        <Label className="text-xs uppercase text-muted-foreground">Season months</Label>
        <p className="text-[11px] text-muted-foreground">Select months when this rate applies (1-12)</p>
        <div className="grid grid-cols-3 gap-2">
          {monthOptions.map((month) => (
            <Controller
              key={month.value}
              control={control}
              name={`pricing_details.season_months`}
              render={({ field }) => {
                const selectedMonths = (field.value as number[]) ?? []
                const isSelected = selectedMonths.includes(month.value)
                
                return (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...selectedMonths, month.value])
                        } else {
                          field.onChange(selectedMonths.filter((m) => m !== month.value))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    {month.label}
                  </label>
                )
              }}
            />
          ))}
        </div>
      </div>

      <Controller
        control={control}
        name="pricing_details.blackout_dates"
        render={({ field }) => (
          <div className="grid gap-1">
            <Label className="text-xs uppercase text-muted-foreground">Blackout dates (optional)</Label>
            <TagInput
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              placeholder="YYYY-MM-DD"
            />
            <p className="text-[11px] text-muted-foreground">Dates when this rate does NOT apply (e.g., holidays)</p>
          </div>
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Early Bird Pricing Fields
// ============================================================================

function EarlyBirdPricingFields() {
  const { control } = useFormContext()
  
  return (
    <OptionSection
      title="Early Bird Configuration"
      description="Define advance booking requirements and discount amounts."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="pricing_details.booking_days_ahead"
          render={({ field }) => (
            <NumberInputField
              label="Booking days ahead"
              description="Must book at least this many days in advance"
              value={field.value}
              onChange={field.onChange}
              min={1}
            />
          )}
        />
        <Controller
          control={control}
          name="pricing_details.discount_percentage"
          render={({ field }) => (
            <NumberInputField
              label="Discount percentage (optional)"
              description="Percentage discount (e.g., 10 for 10% off)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={100}
              step={0.1}
            />
          )}
        />
      </div>
      <Controller
        control={control}
        name="pricing_details.discount_amount"
        render={({ field }) => (
          <NumberInputField
            label="Discount amount (optional)"
            description="Fixed discount amount (alternative to percentage)"
            value={field.value}
            onChange={field.onChange}
            min={0}
            step={0.01}
          />
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Last Minute Pricing Fields
// ============================================================================

function LastMinutePricingFields() {
  const { control } = useFormContext()
  
  return (
    <OptionSection
      title="Last Minute Configuration"
      description="Define last-minute booking window and discount amounts."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="pricing_details.booking_days_max"
          render={({ field }) => (
            <NumberInputField
              label="Booking days max"
              description="Must book within this many days (e.g., 7 for within a week)"
              value={field.value}
              onChange={field.onChange}
              min={1}
            />
          )}
        />
        <Controller
          control={control}
          name="pricing_details.discount_percentage"
          render={({ field }) => (
            <NumberInputField
              label="Discount percentage (optional)"
              description="Percentage discount (e.g., 15 for 15% off)"
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={100}
              step={0.1}
            />
          )}
        />
      </div>
      <Controller
        control={control}
        name="pricing_details.discount_amount"
        render={({ field }) => (
          <NumberInputField
            label="Discount amount (optional)"
            description="Fixed discount amount (alternative to percentage)"
            value={field.value}
            onChange={field.onChange}
            min={0}
            step={0.01}
          />
        )}
      />
    </OptionSection>
  )
}

// ============================================================================
// Occupancy-Based Pricing Fields (Following Occupancy Pattern)
// ============================================================================

function OccupancyBasedPricingFields() {
  const { control, setValue, watch } = useFormContext()
  
  const pricingDetails = watch("pricing_details")
  const basePrice = watch("base_price")
  
  useEffect(() => {
    // Initialize if missing (same pattern as occupancy)
    if (!pricingDetails || typeof pricingDetails !== "object") {
      // Don't initialize from base_price - let user set occupancy prices independently
      setValue("pricing_details", {
        single_occupancy_price: undefined,
        double_occupancy_price: undefined,
        base_occupancy: 2,
      }, { shouldDirty: false })
      return
    }

    const {
      single_occupancy_price,
      double_occupancy_price,
      triple_occupancy_price,
      quadruple_occupancy_price,
      extra_person_charge,
      base_occupancy = 2,
    } = pricingDetails
    
    // Normalize: ensure valid base_occupancy
    const safeBaseOccupancy = base_occupancy === 1 ? 1 : 2
    
    // Handle double occupancy: only use value if explicitly set, never fallback to base_price
    const safeDouble = double_occupancy_price !== undefined && double_occupancy_price !== null
      ? Math.max(0, Number(double_occupancy_price) || 0)
      : undefined
    
    // Handle single occupancy: preserve user input, don't enforce single >= double
    let finalSingle: number | undefined
    if (single_occupancy_price === undefined || single_occupancy_price === null) {
      // Not set - leave undefined (calculation will use double_occupancy_price, not base_price)
      finalSingle = undefined
    } else {
      const safeSingle = Math.max(0, Number(single_occupancy_price) || 0)
      // If single is 0, treat as not set (undefined)
      if (safeSingle === 0) {
        finalSingle = undefined // Will use double in calculation
      } else {
        // Preserve user's input exactly - don't enforce any relationship with double
        finalSingle = safeSingle
      }
    }
    
    // Handle triple occupancy: if set and valid, use it; if not set or 0, leave undefined
    const safeTriple = triple_occupancy_price !== undefined && triple_occupancy_price !== null && Number(triple_occupancy_price) > 0
      ? Math.max(safeDouble ?? 0, Number(triple_occupancy_price))
      : undefined
    
    // Handle quadruple occupancy: if set and valid, use it; if not set or 0, leave undefined
    const safeQuadruple = quadruple_occupancy_price !== undefined && quadruple_occupancy_price !== null && Number(quadruple_occupancy_price) > 0
      ? Math.max((safeTriple ?? safeDouble ?? 0), Number(quadruple_occupancy_price))
      : undefined
    
    const safeExtra = extra_person_charge !== undefined && extra_person_charge !== null && Number(extra_person_charge) > 0
      ? Math.max(0, Number(extra_person_charge))
      : undefined
    
    // ONLY sync base_price FROM double_occupancy_price (never the reverse)
    // This ensures base_price matches the standard (double) rate when double is set
    if ((!basePrice || basePrice === 0) && safeDouble !== undefined && safeDouble > 0) {
      setValue("base_price", safeDouble, { shouldDirty: false })
    }

    // Check if normalization needed
    if (
      finalSingle !== single_occupancy_price ||
      safeDouble !== double_occupancy_price ||
      safeTriple !== triple_occupancy_price ||
      safeQuadruple !== quadruple_occupancy_price ||
      safeExtra !== extra_person_charge ||
      safeBaseOccupancy !== base_occupancy
    ) {
      setValue("pricing_details", {
        ...pricingDetails,
        single_occupancy_price: finalSingle,
        double_occupancy_price: safeDouble,
        triple_occupancy_price: safeTriple,
        quadruple_occupancy_price: safeQuadruple,
        extra_person_charge: safeExtra,
        base_occupancy: safeBaseOccupancy,
      }, { shouldDirty: false })
    }
  }, [pricingDetails, basePrice, setValue])

  return (
    <div className="space-y-6">
      <OptionSection
        title="Occupancy Pricing Configuration"
        description="Define room rates based on number of occupants. This is the standard hotel pricing model."
      >
        <div className="space-y-4">
          {/* Single Occupancy */}
          <Controller
            control={control}
            name="pricing_details.single_occupancy_price"
            render={({ field }) => (
              <NumberInputField
                label="Single Occupancy Rate"
                description="Rate for 1 person. If not set, defaults to double occupancy rate."
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={0.01}
              />
            )}
          />

          {/* Double Occupancy */}
          <Controller
            control={control}
            name="pricing_details.double_occupancy_price"
            render={({ field }) => (
              <NumberInputField
                label="Double Occupancy Rate"
                description="Rate for 2 people (standard rate)"
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={0.01}
              />
            )}
          />

          {/* Triple Occupancy (Optional) */}
          <Controller
            control={control}
            name="pricing_details.triple_occupancy_price"
            render={({ field }) => (
              <NumberInputField
                label="Triple Occupancy Rate (Optional)"
                description="Rate for 3 people. If empty, calculated as: Double + 1× Extra Person charge (if set). Otherwise uses double occupancy rate."
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={0.01}
              />
            )}
          />

          {/* Quadruple Occupancy (Optional) */}
          <Controller
            control={control}
            name="pricing_details.quadruple_occupancy_price"
            render={({ field }) => (
              <NumberInputField
                label="Quadruple Occupancy Rate (Optional)"
                description="Rate for 4 people. If empty, calculated as: Base Occupancy + 2× Extra Person charge (if set). Otherwise uses calculation based on base occupancy."
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={0.01}
              />
            )}
          />

          {/* Extra Person Charge */}
          <Controller
            control={control}
            name="pricing_details.extra_person_charge"
            render={({ field }) => (
              <NumberInputField
                label="Extra Person Charge (Optional)"
                description="Per person charge applied after base occupancy (e.g., $40/person/night)"
                value={field.value}
                onChange={field.onChange}
                min={0}
                step={0.01}
              />
            )}
          />

          {/* Base Occupancy */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Base Occupancy</Label>
            <p className="text-[11px] text-muted-foreground">
              Used for extra person calculation. Most hotels use 2 people as base.
            </p>
            <Controller
              control={control}
              name="pricing_details.base_occupancy"
              render={({ field }) => (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.value === 1}
                      onChange={() => field.onChange(1)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">1 person</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.value === 2}
                      onChange={() => field.onChange(2)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">2 people (standard)</span>
                  </label>
                </div>
              )}
            />
          </div>
        </div>

        {/* Helper Info */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-3">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Calculation Logic:</p>
          <ul className="text-[11px] text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li><strong>1 person:</strong> Single Occupancy Rate (if set) OR Double Occupancy Rate</li>
            <li><strong>2 people:</strong> Double Occupancy Rate (always used)</li>
            <li><strong>3 people:</strong> Triple Rate (if set) OR Double + 1× Extra Person charge (if set) OR Double Rate</li>
            <li><strong>4+ people:</strong> Quadruple Rate (if set) OR Base Occupancy Rate + (Occupancy - Base) × Extra Person charge (if set) OR Double Rate</li>
          </ul>
          <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-2 italic">
            Note: Rates never fallback to base_price. They use the occupancy-specific rates or calculations based on double occupancy.
          </p>
        </div>
      </OptionSection>
    </div>
  )
}

// ============================================================================
// Fallback: Raw JSON Editor (for unknown/unsupported models)
// ============================================================================

function RawPricingDetailsFallback() {
  const { watch, setValue } = useFormContext()
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

// ============================================================================
// Advanced JSON Editor (always available as fallback)
// ============================================================================

function AdvancedPricingDetailsEditor() {
  const { watch, setValue } = useFormContext()
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

