"use client"

import { useMemo, useEffect, useState, useTransition, useCallback } from "react"
import type { ReactNode } from "react"
import { useForm, FormProvider, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { ProductAttributeEditor } from "@/components/products/product-attribute-editor"
import { toast } from "sonner"
import { TagInput } from "@/components/ui/tag-input"
import { ProductImageUploader } from "@/components/products/product-image-uploader"
import { generateProductCode, isProductCodeAvailable } from "@/lib/actions/products"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  product_type_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
  location: z.any().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  attributes: z.any().optional(),
  media: z.array(z.string()).optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

type ProductFormProps = {
  productTypes: { id: string; name: string; code: string }[]
  events: { id: string; event_name: string; event_code: string | null; event_date_from: string | null; event_date_to: string | null }[]
  defaultValues?: Partial<ProductFormValues>
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitLabel?: string
  successMessage?: string
  errorMessage?: string
  redirectPath?: string
  secondaryAction?: ReactNode
  productId?: string
}

export function AddProductForm({
  productTypes,
  events,
  defaultValues,
  onSubmit,
  submitLabel = "Save product",
  successMessage = "Product saved",
  errorMessage = "Failed to save product",
  redirectPath,
  secondaryAction,
  productId,
}: ProductFormProps) {
  const router = useRouter()
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(Boolean(defaultValues?.code))
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "duplicate" | "available">("idle")
  const [isPending, startTransition] = useTransition()

  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      name: "",
      code: "",
      product_type_id: defaultValues?.product_type_id ?? productTypes[0]?.id,
      description: defaultValues?.description ?? "",
      event_id: defaultValues?.event_id ?? null,
      is_active: defaultValues?.is_active ?? true,
      tags: defaultValues?.tags ?? [],
      attributes: defaultValues?.attributes ?? {},
      media: defaultValues?.media ?? [],
      location: defaultValues?.location ?? {},
    },
    mode: "onChange",
  })

  useEffect(() => {
    if (defaultValues) {
      methods.reset({
        name: defaultValues.name ?? "",
        code: defaultValues.code ?? "",
        product_type_id: defaultValues.product_type_id ?? productTypes[0]?.id,
        description: defaultValues.description ?? "",
        event_id: defaultValues.event_id ?? null,
        is_active: defaultValues.is_active ?? true,
        tags: defaultValues.tags ?? [],
        attributes: defaultValues.attributes ?? {},
        media: defaultValues.media ?? [],
        location: defaultValues.location ?? {},
      })
      setCodeManuallyEdited(Boolean(defaultValues.code))
      setCodeStatus("idle")
    }
  }, [defaultValues, productTypes, methods])

  const selectedType = methods.watch("product_type_id")
  const productTypeCode = useMemo(
    () => productTypes.find((type) => type.id === selectedType)?.code ?? "",
    [selectedType, productTypes]
  )

  const name = methods.watch("name")
  const [debouncedName, setDebouncedName] = useState<string>(name ?? "")
  const eventOptions = useMemo<ComboboxOption[]>(
    () =>
      events.map((event) => {
        const labelParts = [event.event_name]
        if (event.event_code) {
          labelParts.push(`(${event.event_code})`)
        }

        const dateParts: string[] = []
        if (event.event_date_from) {
          dateParts.push(new Date(event.event_date_from).toLocaleDateString())
        }
        if (event.event_date_to && event.event_date_to !== event.event_date_from) {
          dateParts.push(new Date(event.event_date_to).toLocaleDateString())
        }

        return {
          value: event.id,
          label: labelParts.join(" "),
          description: dateParts.length ? dateParts.join(" — ") : undefined,
        }
      }),
    [events]
  )

  const productTypeOptions = useMemo<ComboboxOption[]>(
    () =>
      productTypes.map((type) => ({
        value: type.id,
        label: type.name,
        description: type.code ? `Code: ${type.code}` : undefined,
      })),
    [productTypes]
  )

  useEffect(() => {
    if (!codeManuallyEdited && debouncedName && selectedType) {
      startTransition(async () => {
        try {
          const suggested = await generateProductCode(selectedType, debouncedName, productId)
          methods.setValue("code", suggested)
          setCodeStatus("available")
          methods.clearErrors("code")
        } catch (err) {
          console.error("generateProductCode error", err)
        }
      })
    }
  }, [debouncedName, selectedType, codeManuallyEdited, productId, methods])

  const checkCode = useCallback(
    (value: string) => {
      if (!value || !selectedType) {
        setCodeStatus("idle")
        return
      }
      setCodeStatus("checking")
      startTransition(async () => {
        const available = await isProductCodeAvailable(value, selectedType, productId)
        setCodeStatus(available ? "available" : "duplicate")
        if (!available) {
          methods.setError("code", { message: "Code already exists" })
        } else {
          methods.clearErrors("code")
        }
      })
    },
    [selectedType, productId, methods]
  )

  useEffect(() => {
    if (codeManuallyEdited && selectedType) {
      const currentCode = methods.getValues("code")
      if (currentCode) {
        checkCode(currentCode)
      }
    }
  }, [codeManuallyEdited, selectedType, checkCode, methods])

  const handleSubmit = methods.handleSubmit(async (values: ProductFormValues) => {
    if (codeStatus === "duplicate") {
      toast.error("Please provide a unique product code")
      return
    }
    try {
      await onSubmit(values)
      toast.success(successMessage)
      if (redirectPath) {
        router.push(redirectPath)
      }
      router.refresh()
    } catch (err) {
      toast.error(errorMessage, {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  })

  return (
    <FormProvider {...methods}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7 space-y-3">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Product overview</h2>
                <p className="text-xs text-muted-foreground">Provide the core details that identify this product.</p>
              </header>
              <div className="grid gap-3">
                <Controller
                  name="name"
                  render={({ field, fieldState }) => (
                    <div className="grid gap-2">
                      <Label htmlFor="product-name">Name</Label>
                      <Input
                        id="product-name"
                        placeholder="Pandora Grand Hotel"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                      {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                    </div>
                  )}
                />

                <Controller
                  name="code"
                  render={({ field, fieldState }) => (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="product-code">Code</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCodeManuallyEdited(false)
                            if (selectedType) {
                              startTransition(async () => {
                                const suggested = await generateProductCode(selectedType, name ?? "", productId)
                                methods.setValue("code", suggested)
                                setCodeStatus("available")
                                methods.clearErrors("code")
                              })
                            }
                          }}
                          disabled={isPending}
                        >
                          Regenerate
                        </Button>
                      </div>
                      <Input
                        id="product-code"
                        placeholder="HOT-PANDORA-GRAND"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          setCodeManuallyEdited(true)
                          setCodeStatus("idle")
                          field.onChange(event.target.value.toUpperCase())
                        }}
                        onBlur={() => checkCode(field.value ?? "")}
                      />
                      {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                      {codeStatus === "checking" ? (
                        <p className="text-xs text-muted-foreground">Checking availability…</p>
                      ) : codeStatus === "duplicate" ? (
                        <p className="text-xs text-destructive">Code already exists in this product type.</p>
                      ) : codeStatus === "available" ? (
                        <p className="text-xs text-muted-foreground">Code is available.</p>
                      ) : null}
                    </div>
                  )}
                />

                <Controller
                  name="description"
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Label htmlFor="product-description">Description</Label>
                      <Textarea
                        id="product-description"
                        rows={4}
                        placeholder="High-level overview, marketing copy, positioning."
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Attributes</h2>
                <p className="text-xs text-muted-foreground">Structured metadata based on product type.</p>
              </header>
              <Tabs defaultValue="structured" className="w-full">
                <TabsList>
                  <TabsTrigger value="structured">Type-specific</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="structured" className="mt-3">
                  <ProductAttributeEditor productTypeKey={productTypeCode} />
                </TabsContent>
                <TabsContent value="advanced" className="mt-3">
                  <Controller
                    name="attributes"
                    render={({ field }) => (
                      <Textarea
                        className="font-mono text-xs min-h-[220px]"
                        placeholder={`{
  "accommodation": {
    "star_rating": 5
  }
}`}
                        value={JSON.stringify(field.value ?? {}, null, 2)}
                        onChange={(event) => {
                          try {
                            const parsed = JSON.parse(event.target.value)
                            field.onChange(parsed)
                          } catch {
                            // ignore malformed JSON
                          }
                        }}
                      />
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="md:col-span-5 space-y-3">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Classification</h2>
                <p className="text-xs text-muted-foreground">Choose the product category and status.</p>
              </header>
              <div className="grid gap-3">
                <Controller
                  name="product_type_id"
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Label htmlFor="product-type">Product type</Label>
                      <Combobox
                        id="product-type"
                        options={productTypeOptions}
                        value={field.value ?? null}
                        onChange={(value) => {
                          field.onChange(value)
                          setCodeStatus("idle")
                        }}
                        placeholder="Select product type"
                        searchPlaceholder="Search product types..."
                        emptyMessage="No product types found."
                        disabled={productTypeOptions.length === 0}
                      />
                    </div>
                  )}
                />

                <Controller
                  name="event_id"
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Label htmlFor="product-event">Event</Label>
                      <Combobox
                        options={eventOptions}
                        value={field.value ?? null}
                        onChange={(value) => {
                          field.onChange(value)
                        }}
                        placeholder="Select event"
                        searchPlaceholder="Search events..."
                        emptyMessage="No events found."
                        clearable
                        id="product-event"
                      />
                      <p className="text-xs text-muted-foreground">Optional: link this product to an event.</p>
                    </div>
                  )}
                />

                <Controller
                  name="is_active"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-md border bg-muted/20 p-2.5">
                      <div>
                        <p className="text-sm font-medium">Active</p>
                        <p className="text-xs text-muted-foreground">Inactive products will be hidden from search and unavailable for booking.</p>
                      </div>
                      <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Location / venue</h2>
                <p className="text-xs text-muted-foreground">Optional information used for maps, logistics, and search.</p>
              </header>
              <div className="grid gap-3">
                <Controller
                  name="location.address_line1"
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Label>Address</Label>
                      <Input placeholder="123 Ocean Drive" value={field.value ?? ""} onChange={field.onChange} />
                    </div>
                  )}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Controller
                    name="location.city"
                    render={({ field }) => (
                      <div className="grid gap-2">
                        <Label>City</Label>
                        <Input placeholder="City" value={field.value ?? ""} onChange={field.onChange} />
                      </div>
                    )}
                  />
                  <Controller
                    name="location.country"
                    render={({ field }) => (
                      <div className="grid gap-2">
                        <Label>Country</Label>
                        <Input placeholder="Country" value={field.value ?? ""} onChange={field.onChange} />
                      </div>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Controller
                    name="location.latitude"
                    render={({ field }) => (
                      <div className="grid gap-2">
                        <Label>Latitude</Label>
                        <Input placeholder="-8.409517" value={field.value ?? ""} onChange={field.onChange} />
                      </div>
                    )}
                  />
                  <Controller
                    name="location.longitude"
                    render={({ field }) => (
                      <div className="grid gap-2">
                        <Label>Longitude</Label>
                        <Input placeholder="115.188919" value={field.value ?? ""} onChange={field.onChange} />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Tags</h2>
                <p className="text-xs text-muted-foreground">Categorise products for search and reporting.</p>
              </header>
              <Controller
                name="tags"
                render={({ field }) => (
                  <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="Add tag" />
                )}
              />
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <header>
                <h2 className="text-base font-semibold">Images</h2>
                <p className="text-xs text-muted-foreground">Upload media assets stored in the Supabase product_images bucket.</p>
              </header>
              <Controller
                name="media"
                render={({ field }) => (
                  <ProductImageUploader value={field.value ?? []} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end space-x-2">
          {secondaryAction}
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}