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
import { RATE_BASIS, PRICING_MODEL, type RateBasis, type PricingModel } from "@/lib/types/selling-rates"
import { RATE_BASIS_OPTIONS, PRICING_MODEL_INFO, SELLING_RATES_DEFAULTS } from "@/lib/constants/selling-rates"
import { PricingDetailsEditor } from "@/components/products/selling-rates/pricing-details-editor"
import { detectRateConflicts, formatConflictMessage } from "@/lib/utils/selling-rates"

const formSchema = z.object({
  product_id: z.string().uuid(),
  product_option_id: z.string().uuid().nullable().optional(),
  rate_name: z.string().trim().optional().nullable(),
  rate_basis: z.enum([RATE_BASIS.PER_NIGHT, RATE_BASIS.PER_PERSON, RATE_BASIS.PER_ITEM, RATE_BASIS.PER_BOOKING, RATE_BASIS.FLAT_RATE]).refine((val) => val, {
    message: "Rate basis is required",
  }),
  pricing_model: z.enum([
    PRICING_MODEL.STANDARD,
    PRICING_MODEL.EXTRA_NIGHT,
    PRICING_MODEL.WEEKEND,
    PRICING_MODEL.PER_PERSON,
    PRICING_MODEL.TIERED,
    PRICING_MODEL.PASS_TYPE,
    PRICING_MODEL.SEASONAL,
    PRICING_MODEL.EARLY_BIRD,
    PRICING_MODEL.LAST_MINUTE,
    PRICING_MODEL.OCCUPANCY_BASED,
  ]).refine((val) => val, {
    message: "Pricing model is required",
  }),
  valid_from: z.date(),
  valid_to: z.date(),
  base_price: z.coerce.number().min(0, "Base price is required"),
  currency: z.string().trim().length(3, "Currency needs 3 letters").transform((value) => value.toUpperCase()),
      markup_type: z.string().optional().nullable(),
      markup_amount: z.coerce.number().optional().nullable(),
  pricing_details: z.any().optional(), // Validated per pricing model in PricingDetailsEditor
  target_cost: z.coerce.number().optional().nullable(),
  profit_margin: z.coerce.number().min(0).max(1000).optional().nullable(), // 0-1000% margin
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
  existingRates?: SellingRateDetails[] // For conflict detection
}

export function SellingRateDialog({ productId, optionId, mode, open, onOpenChange, rate, existingRates = [] }: SellingRateDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultValues = useMemo<SellingRateFormValues>(() => {
    if (!rate) {
      return {
        product_id: productId,
        product_option_id: optionId ?? null,
        rate_name: "",
        rate_basis: SELLING_RATES_DEFAULTS.RATE_BASIS,
        pricing_model: SELLING_RATES_DEFAULTS.PRICING_MODEL,
        valid_from: new Date(),
        valid_to: new Date(),
        base_price: SELLING_RATES_DEFAULTS.BASE_PRICE,
        currency: SELLING_RATES_DEFAULTS.CURRENCY,
            markup_type: null,
            markup_amount: null,
        pricing_details: {},
        target_cost: undefined,
        profit_margin: undefined,
        is_active: SELLING_RATES_DEFAULTS.IS_ACTIVE,
      }
    }

    const { valid_from, valid_to, pricing_details, currency, markup_type, markup_amount, target_cost } = rate
    
    // Calculate profit margin from existing base_price and target_cost
    const existingMargin = target_cost && rate.base_price && target_cost > 0
      ? ((rate.base_price - target_cost) / target_cost) * 100
      : undefined
    
    // Ensure rate_basis and pricing_model are valid enum values
    const validRateBasis = Object.values(RATE_BASIS).includes(rate.rate_basis as RateBasis) 
      ? (rate.rate_basis as RateBasis) 
      : SELLING_RATES_DEFAULTS.RATE_BASIS
    
    const validPricingModel = Object.values(PRICING_MODEL).includes(rate.pricing_model as PricingModel)
      ? (rate.pricing_model as PricingModel)
      : SELLING_RATES_DEFAULTS.PRICING_MODEL
    
    return {
      product_id: productId,
      product_option_id: rate.option_id ?? null,
      rate_name: rate.rate_name ?? "",
      rate_basis: validRateBasis,
      pricing_model: validPricingModel,
      valid_from: new Date(valid_from),
      valid_to: new Date(valid_to),
      base_price: rate.base_price,
      currency: currency || SELLING_RATES_DEFAULTS.CURRENCY,
      markup_type: null,
      markup_amount: null,
      pricing_details: pricing_details ?? {},
      target_cost: target_cost ?? undefined,
      profit_margin: existingMargin ?? undefined,
      is_active: rate.is_active,
    }
  }, [productId, optionId, rate])

  const methods = useForm<SellingRateFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      methods.reset(defaultValues)
    }
  }, [defaultValues, methods, open])

  // Watch date changes for conflict detection
  const validFrom = methods.watch("valid_from")
  const validTo = methods.watch("valid_to")
  const conflicts = useMemo(() => {
    if (!validFrom || !validTo || existingRates.length === 0) return []
    
    return detectRateConflicts(
      {
        id: rate?.id,
        product_option_id: optionId ?? null,
        valid_from: validFrom,
        valid_to: validTo,
      },
      existingRates
    )
  }, [validFrom, validTo, optionId, rate?.id, existingRates])

  const selectedPricingModel = methods.watch("pricing_model")
  const targetCost = methods.watch("target_cost")
  const profitMargin = methods.watch("profit_margin") as number | undefined // New field for cost-plus
  const [manualBasePrice, setManualBasePrice] = useState(false) // Toggle for manual override

  // Cost-plus calculation: base_price = target_cost × (1 + profit_margin / 100)
  useEffect(() => {
    const cost = typeof targetCost === "number" && !isNaN(targetCost) ? targetCost : 0
    const margin = typeof profitMargin === "number" && !isNaN(profitMargin) ? profitMargin : 0
    if (!manualBasePrice && cost > 0 && margin >= 0) {
      const calculatedBasePrice = cost * (1 + margin / 100)
      const currentBasePrice = methods.getValues("base_price")
      if (typeof currentBasePrice === "number" && !isNaN(currentBasePrice) && Math.abs(currentBasePrice - calculatedBasePrice) > 0.01) {
        methods.setValue("base_price", Number(calculatedBasePrice.toFixed(2)), { shouldDirty: false })
      }
    }
  }, [targetCost, profitMargin, manualBasePrice, methods])

  // Calculate margin from base_price and target_cost (for reverse calculation)
  const calculatedMargin = useMemo(() => {
    const basePrice = methods.watch("base_price")
    const cost = typeof targetCost === "number" ? targetCost : 0
    const bp = typeof basePrice === "number" ? basePrice : 0
    if (bp > 0 && cost > 0) {
      return ((bp - cost) / cost) * 100
    }
    return null
  }, [methods.watch("base_price"), targetCost])

  const title = mode === "create" ? "New selling rate" : `Edit ${rate?.rate_name ?? "selling rate"}`
  const description = mode === "create" ? "Define pricing for this product option." : "Update selling rate details."

  const handleSubmitForm = methods.handleSubmit((values: SellingRateFormValues) => {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          product_option_id: optionId ?? null,
          valid_from: format(values.valid_from, "yyyy-MM-dd") as any,
          valid_to: format(values.valid_to, "yyyy-MM-dd") as any,
          pricing_details: values.pricing_details ?? {},
        }

        if (mode === "create") {
          await createSellingRate(payload as any)
          toast.success("Selling rate created")
        } else if (rate) {
          await updateSellingRate(rate.id, payload as any)
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
      <DialogContent className="max-w-2xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form id="selling-rate-form" className="space-y-6" onSubmit={handleSubmitForm}>
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
                        {Object.values(RATE_BASIS_OPTIONS).map((option) => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {methods.formState.errors.rate_basis ? (
                      <p className="text-xs text-destructive">{methods.formState.errors.rate_basis.message}</p>
                    ) : null}
                  </div>
                )}
              />
            </div>

            <div className="grid gap-4">
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
                            <div className="flex flex-col">
                              <span>{info.label}</span>
                              <span className="text-xs text-muted-foreground">{info.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {methods.formState.errors.pricing_model ? (
                      <p className="text-xs text-destructive">{methods.formState.errors.pricing_model.message}</p>
                    ) : null}
                  </div>
                )}
              />
            </div>

            {/* Supplier Cost & Pricing Section - Cost-Plus Model */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div>
                <h4 className="text-sm font-semibold">Supplier Cost & Pricing</h4>
                <p className="text-xs text-muted-foreground">Set cost and margin to calculate price</p>
              </div>

              {/* Supplier Cost & Profit Margin */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label htmlFor="target_cost" className="text-xs">Supplier cost <span className="text-destructive">*</span></Label>
                  <Input 
                    id="target_cost" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    className="h-9"
                    {...methods.register("target_cost", { valueAsNumber: true })} 
                  />
                  {methods.formState.errors.target_cost ? (
                    <p className="text-[10px] text-destructive">{methods.formState.errors.target_cost.message}</p>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="profit_margin" className="text-xs">Profit margin (%) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="profit_margin" 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1000" 
                    className="h-9"
                    {...methods.register("profit_margin", { valueAsNumber: true })} 
                  />
                  {methods.formState.errors.profit_margin ? (
                    <p className="text-[10px] text-destructive">{methods.formState.errors.profit_margin.message}</p>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Currency</Label>
                  <Input maxLength={3} className="h-9" {...methods.register("currency")} />
                  {methods.formState.errors.currency ? (
                    <p className="text-[10px] text-destructive">{methods.formState.errors.currency.message}</p>
                  ) : null}
                </div>
              </div>

              {/* Base Price */}
              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="base_price" className="text-xs">Base selling price</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="manual-base-price"
                      checked={manualBasePrice}
                      onChange={(e) => {
                        setManualBasePrice(e.target.checked)
                        const cost = typeof targetCost === "number" && !isNaN(targetCost) ? targetCost : 0
                        const margin = typeof profitMargin === "number" && !isNaN(profitMargin) ? profitMargin : 0
                        if (!e.target.checked && cost > 0 && margin >= 0) {
                          const calculated = cost * (1 + margin / 100)
                          if (!isNaN(calculated)) {
                            methods.setValue("base_price", Number(calculated.toFixed(2)))
                          }
                        }
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <Label htmlFor="manual-base-price" className="text-[11px] font-normal cursor-pointer">
                      Manual
                    </Label>
                  </div>
                </div>
                <Input 
                  id="base_price" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  {...methods.register("base_price", { valueAsNumber: true })}
                  disabled={Boolean(!manualBasePrice && typeof targetCost === "number" && !isNaN(targetCost) && targetCost > 0 && typeof profitMargin === "number" && !isNaN(profitMargin) && profitMargin >= 0)}
                  className={!manualBasePrice && typeof targetCost === "number" && !isNaN(targetCost) && targetCost > 0 && typeof profitMargin === "number" && !isNaN(profitMargin) && profitMargin >= 0 ? "bg-muted h-9" : "h-9"}
                />
                {!manualBasePrice && typeof targetCost === "number" && !isNaN(targetCost) && targetCost > 0 && typeof profitMargin === "number" && !isNaN(profitMargin) && profitMargin >= 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Auto: ${targetCost.toFixed(2)} × (1 + {profitMargin.toFixed(1)}%) = ${(typeof methods.watch("base_price") === "number" && !isNaN(methods.watch("base_price")) ? methods.watch("base_price") : 0).toFixed(2)}
                  </p>
                ) : selectedPricingModel === PRICING_MODEL.OCCUPANCY_BASED ? (
                  <p className="text-[10px] text-muted-foreground">
                    Default price. Set occupancy rates below.
                  </p>
                ) : null}
                {methods.formState.errors.base_price ? (
                  <p className="text-[10px] text-destructive">{methods.formState.errors.base_price.message}</p>
                ) : null}
              </div>

            </div>

            {/* Simple Pricing Summary */}
            {(() => {
              const basePrice = methods.watch("base_price") || 0
              const cost = typeof targetCost === "number" && !isNaN(targetCost) ? targetCost : 0
              const currency = methods.watch("currency") || "USD"
              
              // Customer pays = base price (no additional markup)
              const customerPrice = basePrice
              
              // Show summary if we have valid base price
              if (basePrice > 0 && cost > 0) {
                const profit = basePrice - cost
                const markupOnCost = cost > 0 ? (profit / cost) * 100 : 0
                
                return (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Customer pays:</span>
                        <span className="font-semibold">{currency} {customerPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Your cost:</span>
                        <span>{currency} {cost.toFixed(2)}</span>
                      </div>
                      {profit > 0 ? (
                        <div className="border-t pt-2 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">Your profit:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{currency} {profit.toFixed(2)} ({markupOnCost.toFixed(1)}% margin)</span>
                          </div>
                        </div>
                      ) : profit === 0 ? (
                        <div className="border-t pt-2 mt-1">
                          <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400">
                            <span className="text-xs font-medium">Profit:</span>
                            <span className="font-bold">{currency} 0.00 (break-even)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t pt-2 mt-1">
                          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                            <span className="text-xs font-medium">Your loss:</span>
                            <span className="font-bold">{currency} {Math.abs(profit).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              } else if (basePrice > 0) {
                // Show minimal summary if no cost entered
                return (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Customer pays:</span>
                      <span className="font-semibold">{currency} {customerPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )
              }
              
              return null
            })()}

            <Controller
              name="valid_from"
              control={methods.control}
              render={() => {
                const dateRange: { from: Date; to?: Date } | undefined = {
                  from: methods.watch("valid_from"),
                  to: methods.watch("valid_to"),
                }

                return (
                  <div className="grid gap-2">
                    <Label>Validity window</Label>
                    <DateRangePicker
                      value={dateRange}
                      onChange={(range) => {
                        if (range?.from) methods.setValue("valid_from", range.from)
                        if (range?.to) methods.setValue("valid_to", range.to)
                      }}
                      placeholder="Select date range"
                    />
                    {methods.formState.errors.valid_from || methods.formState.errors.valid_to ? (
                      <p className="text-xs text-destructive">Select a valid date range.</p>
                    ) : null}
                    {conflicts.length > 0 && (
                      <div className="rounded-lg border border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900 p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                              Rate conflict detected
                            </p>
                            <p className="text-[11px] text-yellow-800 dark:text-yellow-200">
                              {formatConflictMessage(conflicts)}
                            </p>
                            {conflicts.length > 1 && (
                              <ul className="mt-2 text-[11px] text-yellow-800 dark:text-yellow-200 list-disc list-inside space-y-0.5">
                                {conflicts.map((conflict, idx) => (
                                  <li key={idx}>
                                    "{conflict.rateName || "Untitled rate"}" ({conflict.overlappingDates.from} to {conflict.overlappingDates.to})
                                  </li>
                                ))}
                              </ul>
                            )}
                            <p className="text-[10px] text-yellow-700 dark:text-yellow-300 mt-2 italic">
                              You can still save this rate, but overlapping rates may cause confusion in booking.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* Model-Specific Pricing Details - Dynamic Form Builder */}
            <PricingDetailsEditor pricingModel={selectedPricingModel} />

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive rates stay hidden from booking flows.</p>
              </div>
              <Switch checked={methods.watch("is_active") ?? true} onCheckedChange={(checked) => methods.setValue("is_active", checked)} />
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

