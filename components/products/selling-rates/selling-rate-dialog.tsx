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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DateRangePicker } from "@/components/protected/DateRangePicker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSellingRate, updateSellingRate } from "@/lib/actions/selling-rates"
import type { SellingRateDetails } from "@/lib/data/products"

const pricingModelOptions = [
  { value: "standard", label: "Standard" },
  { value: "extra_night", label: "Extra night" },
  { value: "weekend", label: "Weekend" },
  { value: "per_person", label: "Per person" },
  { value: "tiered", label: "Tiered" },
  { value: "pass_type", label: "Pass type" },
]

const formSchema = z.object({
  product_id: z.string().uuid(),
  product_option_id: z.string().uuid().nullable().optional(),
  rate_name: z.string().trim().optional().nullable(),
  rate_basis: z.string().trim().min(1, "Rate basis is required"),
  pricing_model: z.string().trim().min(1, "Pricing model is required"),
  valid_from: z.date({ required_error: "Start date is required" }),
  valid_to: z.date({ required_error: "End date is required" }),
  base_price: z.coerce.number({ required_error: "Base price is required" }).min(0),
  currency: z.string().trim().length(3, "Currency needs 3 letters").transform((value) => value.toUpperCase()),
  markup_type: z.string().trim().optional().nullable(),
  markup_amount: z.coerce.number().optional().nullable(),
  pricing_details: z.string().optional(),
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
  const [pricingDetailsDraft, setPricingDetailsDraft] = useState<string>("{}")
  const [draftError, setDraftError] = useState<string | null>(null)

  const defaultValues = useMemo<SellingRateFormValues>(() => {
    if (!rate) {
      return {
        product_id: productId,
        product_option_id: optionId ?? null,
        rate_name: "",
        rate_basis: "per_night",
        pricing_model: "standard",
        valid_from: new Date(),
        valid_to: new Date(),
        base_price: 0,
        currency: "USD",
        markup_type: undefined,
        markup_amount: undefined,
        pricing_details: "{}",
        target_cost: undefined,
        is_active: true,
      }
    }

    const { valid_from, valid_to, pricing_details, currency, markup_type, markup_amount, target_cost } = rate
    const parsedPricing = JSON.stringify(pricing_details ?? {}, null, 2)
    return {
      product_id: productId,
      product_option_id: rate.option_id ?? null,
      rate_name: rate.rate_name ?? "",
      rate_basis: rate.rate_basis,
      pricing_model: rate.pricing_model,
      valid_from: new Date(valid_from),
      valid_to: new Date(valid_to),
      base_price: rate.base_price,
      currency,
      markup_type: markup_type ?? undefined,
      markup_amount: markup_amount ?? undefined,
      pricing_details: parsedPricing,
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
      setPricingDetailsDraft(defaultValues.pricing_details ?? "{}")
      setDraftError(null)
    }
  }, [defaultValues, methods, open])

  const title = mode === "create" ? "New selling rate" : `Edit ${rate?.rate_name ?? "selling rate"}`
  const description = mode === "create" ? "Define pricing for this product option." : "Update selling rate details."

  const handleSubmitForm = methods.handleSubmit((values) => {
    startTransition(async () => {
      try {
        let pricingDetails: Record<string, any> = {}
        if (pricingDetailsDraft.trim()) {
          try {
            pricingDetails = JSON.parse(pricingDetailsDraft)
            setDraftError(null)
          } catch (error) {
            setDraftError("Pricing details must be valid JSON")
            return
          }
        }

        const payload = {
          ...values,
          product_option_id: optionId ?? null,
          valid_from: format(values.valid_from, "yyyy-MM-dd"),
          valid_to: format(values.valid_to, "yyyy-MM-dd"),
          pricing_details: pricingDetails,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid gap-2">
                <Label htmlFor="rate_basis">Rate basis</Label>
                <Input id="rate_basis" placeholder="per_night" {...methods.register("rate_basis")} />
                {methods.formState.errors.rate_basis ? (
                  <p className="text-xs text-destructive">{methods.formState.errors.rate_basis.message}</p>
                ) : null}
              </div>
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
                        {pricingModelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input maxLength={3} {...methods.register("currency")} />
                {methods.formState.errors.currency ? (
                  <p className="text-xs text-destructive">{methods.formState.errors.currency.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="base_price">Base price</Label>
                <Input id="base_price" type="number" step="0.01" min="0" {...methods.register("base_price", { valueAsNumber: true })} />
                {methods.formState.errors.base_price ? (
                  <p className="text-xs text-destructive">{methods.formState.errors.base_price.message}</p>
                ) : null}
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
              <div className="grid gap-2">
                <Label htmlFor="markup_type">Markup type</Label>
                <Input id="markup_type" placeholder="percentage" {...methods.register("markup_type")} />
              </div>
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
                    {methods.formState.errors.valid_from || methods.formState.errors.valid_to ? (
                      <p className="text-xs text-destructive">Select a valid date range.</p>
                    ) : null}
                  </div>
                )
              }}
            />

            <div className="grid gap-2">
              <Label htmlFor="pricing_details">Pricing details (JSON)</Label>
              <Textarea
                id="pricing_details"
                rows={6}
                value={pricingDetailsDraft}
                onChange={(event) => setPricingDetailsDraft(event.target.value)}
              />
              {draftError ? <p className="text-xs text-destructive">{draftError}</p> : null}
              <p className="text-xs text-muted-foreground">
                Provide additional qualifiers such as minimum nights, day masks, or tier configurations.
              </p>
            </div>

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

