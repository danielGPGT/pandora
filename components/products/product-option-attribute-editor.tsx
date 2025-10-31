"use client"

import { useEffect, useMemo, useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TagInput } from "@/components/ui/tag-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type OptionFormValues = {
  option_name: string
  option_code: string
  description?: string | null
  is_active: boolean
  attributes?: Record<string, any>
}

type ProductOptionAttributeEditorProps = {
  productTypeKey?: string
}

export function ProductOptionAttributeEditor({ productTypeKey }: ProductOptionAttributeEditorProps) {
  const type = (productTypeKey ?? "").toLowerCase()

  const editor = useMemo(() => {
    switch (type) {
      case "accommodation":
        return <AccommodationOptionFields />
      case "transfer":
        return <TransferOptionFields />
      case "event":
        return <EventOptionFields />
      case "meal":
        return <MealOptionFields />
      case "experience":
        return <ExperienceOptionFields />
      case "equipment":
        return <EquipmentOptionFields />
      case "service":
        return <ServiceOptionFields />
      case "insurance":
        return <InsuranceOptionFields />
      case "extra":
        return <ExtraOptionFields />
      default:
        return null
    }
  }, [type])

  if (!editor) {
    return <RawAttributesFallback />
  }

  return (
    <div className="space-y-6">
      {editor}
      <AdvancedAttributesEditor />
    </div>
  )
}

function AccommodationOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const bedConfig = watch("attributes.bed_config")
  useEffect(() => {
    if (!Array.isArray(bedConfig)) {
      setValue("attributes.bed_config", [])
    }
  }, [bedConfig, setValue])

  const occupancy = watch("attributes.occupancy")
  useEffect(() => {
    if (!occupancy || typeof occupancy !== "object") {
      setValue("attributes.occupancy", { min: 1, standard: 2, max: 2 })
      return
    }

    const { min = 1, standard = 2, max = 2 } = occupancy
    const safeMin = Math.max(0, Number(min) || 1)
    let safeMax = Math.max(safeMin, Number(max) || safeMin)
    let safeStandard = Math.min(Math.max(safeMin, Number(standard) || safeMin), safeMax)

    if (safeMax < safeStandard) {
      safeMax = safeStandard
    }

    if (safeMin !== min || safeStandard !== standard || safeMax !== max) {
      setValue("attributes.occupancy", { min: safeMin, standard: safeStandard, max: safeMax }, { shouldDirty: false })
    }
  }, [occupancy, setValue])

  const amenities = watch("attributes.amenities")
  useEffect(() => {
    if (!Array.isArray(amenities)) {
      setValue("attributes.amenities", [])
    }
  }, [amenities, setValue])

  const images = watch("attributes.images")
  useEffect(() => {
    if (!Array.isArray(images)) {
      setValue("attributes.images", [])
    }
  }, [images, setValue])

  const { fields, append, remove } = useFieldArray({ control, name: "attributes.bed_config" as const })

  const bedTypeOptions = ["double", "twin", "queen", "king", "single", "sofa_bed", "bunk"]

  return (
    <div className="space-y-6">
      <OptionSection
        title="Bed configuration"
        description="List the layouts guests can book (e.g. king, twin)."
      >
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border bg-muted/40 p-3 md:grid-cols-[minmax(0,200px)_minmax(0,160px)_auto] md:items-center"
            >
              <Controller
                control={control}
                name={`attributes.bed_config.${index}.type` as const}
                render={({ field }) => (
                  <div className="grid gap-1">
                    <Label className="text-xs uppercase text-muted-foreground">Bed type</Label>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bedTypeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <Controller
                control={control}
                name={`attributes.bed_config.${index}.quantity` as const}
                render={({ field }) => (
                  <div className="grid gap-1">
                    <Label className="text-xs uppercase text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? 1}
                      onChange={(event) => field.onChange(Number(event.target.value) || 1)}
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
          <Button type="button" variant="outline" size="sm" onClick={() => append({ type: "double", quantity: 1 })}>
            Add configuration
          </Button>
        </div>
      </OptionSection>

      <OptionSection
        title="Occupancy"
        description="Set minimum, standard, and maximum guest counts."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Controller
            control={control}
            name="attributes.occupancy.min"
            render={({ field }) => (
              <NumberInputField label="Minimum" {...field} />
            )}
          />
          <Controller
            control={control}
            name="attributes.occupancy.standard"
            render={({ field }) => (
              <NumberInputField label="Standard" {...field} />
            )}
          />
          <Controller
            control={control}
            name="attributes.occupancy.max"
            render={({ field }) => (
              <NumberInputField label="Maximum" {...field} />
            )}
          />
        </div>
      </OptionSection>

      <OptionSection title="Highlights">
        <Controller
          control={control}
          name="attributes.board_basis"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Board basis</Label>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select basis" />
                </SelectTrigger>
                <SelectContent>
                  {boardBasisOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.view"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">View</Label>
              <Input placeholder="e.g. Sea, city, garden" value={field.value ?? ""} onChange={field.onChange} />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.amenities"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Amenities</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Add amenity" />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.images"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Image URLs</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="https://..." />
            </div>
          )}
        />
      </OptionSection>
    </div>
  )
}

const boardBasisOptions = ["room_only", "bed_and_breakfast", "half_board", "full_board", "all_inclusive"]

function TransferOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const route = watch("attributes.route")
  useEffect(() => {
    if (!route || typeof route !== "object") {
      setValue("attributes.route", { origin: "", destination: "" })
    }
  }, [route, setValue])

  const operatingHours = watch("attributes.operating_hours")
  useEffect(() => {
    if (!operatingHours || typeof operatingHours !== "object") {
      setValue("attributes.operating_hours", { start: "", end: "" })
    }
  }, [operatingHours, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Service" description="Core details describing this transfer option.">
        <div className="grid gap-3">
          <Controller
            control={control}
            name="attributes.vehicle_type"
            render={({ field }) => (
              <TextInputField label="Vehicle type" placeholder="SUV, minibus, sedan" field={field} />
            )}
          />

          <Controller
            control={control}
            name="attributes.service_mode"
            render={({ field }) => (
              <TextInputField label="Service mode" placeholder="Private, shared" field={field} />
            )}
          />
        </div>
      </OptionSection>

      <OptionSection title="Route" description="Where the service begins and ends.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="attributes.route.origin"
            render={({ field }) => (
              <TextInputField label="Origin" placeholder="Pickup point" field={field} />
            )}
          />
          <Controller
            control={control}
            name="attributes.route.destination"
            render={({ field }) => (
              <TextInputField label="Destination" placeholder="Dropoff point" field={field} />
            )}
          />
        </div>
      </OptionSection>

      <OptionSection title="Capacity & duration">
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="attributes.max_passengers"
            render={({ field }) => <NumberInputField label="Max passengers" {...field} />}
          />
          <Controller
            control={control}
            name="attributes.max_baggage"
            render={({ field }) => <NumberInputField label="Max baggage" {...field} />}
          />
        </div>

        <Controller
          control={control}
          name="attributes.duration_minutes"
          render={({ field }) => <NumberInputField label="Duration (minutes)" {...field} />}
        />
      </OptionSection>

      <OptionSection title="Extras">
        <div className="grid gap-3 sm:grid-cols-2">
          <BooleanField
            control={control}
            name="attributes.meet_and_greet"
            label="Meet & greet"
            description="Toggle if representative meets passengers upon arrival."
          />
          <BooleanField
            control={control}
            name="attributes.accessible_vehicle"
            label="Accessible vehicle"
            description="Indicate whether this vehicle supports mobility needs."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="attributes.operating_hours.start"
            render={({ field }) => <TextInputField label="Operating start" placeholder="06:00" field={field} />}
          />
          <Controller
            control={control}
            name="attributes.operating_hours.end"
            render={({ field }) => <TextInputField label="Operating end" placeholder="23:00" field={field} />}
          />
        </div>
      </OptionSection>
    </section>
  )
}

function EventOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const accessLevels = watch("attributes.access_level")
  useEffect(() => {
    if (!Array.isArray(accessLevels)) {
      setValue("attributes.access_level", [])
    }
  }, [accessLevels, setValue])

  const validDays = watch("attributes.valid_days")
  useEffect(() => {
    if (!Array.isArray(validDays)) {
      setValue("attributes.valid_days", [])
    }
  }, [validDays, setValue])

  const perks = watch("attributes.perks")
  useEffect(() => {
    if (!Array.isArray(perks)) {
      setValue("attributes.perks", [])
    }
  }, [perks, setValue])

  const dayMask = watch("attributes.valid_day_mask")
  useEffect(() => {
    if (!dayMask || typeof dayMask !== "object") {
      const defaultMask: Record<string, boolean> = {}
      daysOfWeek.forEach((day) => {
        defaultMask[day] = false
      })
      setValue("attributes.valid_day_mask", defaultMask)
    }
  }, [dayMask, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Ticket details" description="Tier and access permissions for this pass.">
        <div className="grid gap-3">
          <TextInputController control={control} name="attributes.ticket_tier" label="Ticket tier" placeholder="General admission, grandstand" />
          <Controller
            control={control}
            name="attributes.access_level"
            render={({ field }) => (
              <div className="grid gap-1">
                <Label className="text-xs uppercase text-muted-foreground">Access areas</Label>
                <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Main stage, paddock" />
              </div>
            )}
          />
        </div>
      </OptionSection>

      <OptionSection title="Validity" description="Specify which days this ticket grants entry.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Controller
            control={control}
            name="attributes.valid_days"
            render={({ field }) => (
              <div className="grid gap-1">
                <Label className="text-xs uppercase text-muted-foreground">Valid dates</Label>
                <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="YYYY-MM-DD" />
              </div>
            )}
          />

          <DayMaskField control={control} namePrefix="attributes.valid_day_mask" label="Day mask" />
        </div>
      </OptionSection>

      <OptionSection title="Seating & perks">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInputController control={control} name="attributes.seat_section" label="Section" placeholder="Block B" />
          <TextInputController control={control} name="attributes.row" label="Row" placeholder="12" />
          <TextInputController control={control} name="attributes.seat_range" label="Seat range" placeholder="45-48" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="attributes.age_restriction"
            render={({ field }) => (
              <div className="grid gap-1">
                <Label className="text-xs uppercase text-muted-foreground">Age restriction</Label>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_ages">All ages</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="teen">Teen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <TextInputController control={control} name="attributes.delivery_method" label="Delivery method" placeholder="e_ticket" />
        </div>

        <Controller
          control={control}
          name="attributes.perks"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Perks</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Hospitality lounge, pit walk" />
            </div>
          )}
        />

        <TextInputController control={control} name="attributes.barcode_format" label="Barcode format" placeholder="QR" />
      </OptionSection>
    </section>
  )
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

function MealOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const dietaryTags = watch("attributes.dietary_tags")
  useEffect(() => {
    if (!Array.isArray(dietaryTags)) {
      setValue("attributes.dietary_tags", [])
    }
  }, [dietaryTags, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Meal profile">
        <div className="grid gap-3">
          <TextInputController control={control} name="attributes.meal_period" label="Meal period" placeholder="Breakfast, dinner" />
          <TextInputController control={control} name="attributes.menu_theme" label="Menu theme" placeholder="Chef's tasting" />
          <Controller
            control={control}
            name="attributes.courses"
            render={({ field }) => <NumberInputField label="Number of courses" {...field} />}
          />
        </div>
      </OptionSection>

      <OptionSection title="Dietary & party">
        <Controller
          control={control}
          name="attributes.dietary_tags"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Dietary tags</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Vegetarian, gluten free" />
            </div>
          )}
        />

        <BooleanField
          control={control}
          name="attributes.beverages_included"
          label="Beverages included"
          description="Enable if drinks are part of this menu."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInputController control={control} name="attributes.min_party_size" label="Minimum party size" />
          <NumberInputController control={control} name="attributes.max_party_size" label="Maximum party size" />
        </div>
      </OptionSection>

      <OptionSection title="Seating">
        <TextInputController control={control} name="attributes.seating_area" label="Seating area" placeholder="Terrace" />
      </OptionSection>
    </section>
  )
}

function ExperienceOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const included = watch("attributes.equipment_included")
  const required = watch("attributes.equipment_required")
  const languages = watch("attributes.languages")
  useEffect(() => {
    if (!Array.isArray(included)) setValue("attributes.equipment_included", [])
  }, [included, setValue])
  useEffect(() => {
    if (!Array.isArray(required)) setValue("attributes.equipment_required", [])
  }, [required, setValue])
  useEffect(() => {
    if (!Array.isArray(languages)) setValue("attributes.languages", [])
  }, [languages, setValue])

  const weather = watch("attributes.weather_cutoff")
  useEffect(() => {
    if (!weather || typeof weather !== "object") {
      setValue("attributes.weather_cutoff", { wind_speed_kts: undefined })
    }
  }, [weather, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Session overview">
        <TextInputController control={control} name="attributes.session_type" label="Session type" placeholder="Sunrise kayak" />
        <NumberInputController control={control} name="attributes.duration_minutes" label="Duration (minutes)" />

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInputController control={control} name="attributes.group_size_min" label="Min group size" />
          <NumberInputController control={control} name="attributes.group_size_max" label="Max group size" />
        </div>

        <TextInputController control={control} name="attributes.skill_level" label="Skill level" placeholder="Beginner" />
      </OptionSection>

      <OptionSection title="Equipment">
        <Controller
          control={control}
          name="attributes.equipment_included"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Equipment included</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Kayak, life jacket" />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.equipment_required"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Equipment required</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Waterproof shoes" />
            </div>
          )}
        />
      </OptionSection>

      <OptionSection title="Logistics">
        <TextInputController control={control} name="attributes.meeting_point" label="Meeting point" placeholder="Marina Dock A" />

        <Controller
          control={control}
          name="attributes.languages"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Languages</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="en, es" />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.weather_cutoff.wind_speed_kts"
          render={({ field }) => <NumberInputField label="Wind speed cutoff (kts)" {...field} />}
        />
      </OptionSection>
    </section>
  )
}

function EquipmentOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const accessories = watch("attributes.included_accessories")
  useEffect(() => {
    if (!Array.isArray(accessories)) {
      setValue("attributes.included_accessories", [])
    }
  }, [accessories, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Equipment profile">
        <div className="grid gap-3">
          <TextInputController control={control} name="attributes.equipment_type" label="Equipment type" placeholder="Ski set" />
          <TextInputController control={control} name="attributes.brand" label="Brand" placeholder="Atomic" />
          <TextInputController control={control} name="attributes.model" label="Model" placeholder="Redster X9" />
          <TextInputController control={control} name="attributes.size" label="Size / dimensions" placeholder="170cm" />
        </div>
      </OptionSection>

      <OptionSection title="Rental details">
        <TextInputController control={control} name="attributes.condition" label="Condition" placeholder="Premium, standard" />
        <TextInputController control={control} name="attributes.rental_duration" label="Rental duration" placeholder="Daily" />

        <Controller
          control={control}
          name="attributes.included_accessories"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Included accessories</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Poles, helmet" />
            </div>
          )}
        />

        <BooleanField
          control={control}
          name="attributes.insurance_required"
          label="Insurance required"
          description="Toggle if customers must purchase separate insurance."
        />
        <NumberInputController control={control} name="attributes.security_deposit" label="Security deposit" />
      </OptionSection>
    </section>
  )
}

function ServiceOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const equipment = watch("attributes.equipment_provided")
  useEffect(() => {
    if (!Array.isArray(equipment)) setValue("attributes.equipment_provided", [])
  }, [equipment, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Service configuration">
        <TextInputController control={control} name="attributes.service_variant" label="Service variant" placeholder="On-site technician" />
        <TextInputController control={control} name="attributes.coverage_hours" label="Coverage hours" placeholder="08:00-20:00" />
        <NumberInputController control={control} name="attributes.response_time_minutes" label="Response time (minutes)" />
        <TextInputController control={control} name="attributes.staff_ratio" label="Staff ratio" placeholder="1:50" />
        <TextInputController control={control} name="attributes.geo_zone" label="Service area" placeholder="Dubai Mall" />
      </OptionSection>

      <OptionSection title="Resources & notes">
        <Controller
          control={control}
          name="attributes.equipment_provided"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Equipment provided</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Toolkit, radio" />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.sla_notes"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">SLA notes</Label>
              <Textarea rows={3} value={field.value ?? ""} onChange={field.onChange} placeholder="Preventative checks every 4 hours" />
            </div>
          )}
        />
      </OptionSection>
    </section>
  )
}

function InsuranceOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const coverageScope = watch("attributes.coverage_scope")
  const exclusions = watch("attributes.exclusions")
  useEffect(() => {
    if (!Array.isArray(coverageScope)) setValue("attributes.coverage_scope", [])
  }, [coverageScope, setValue])
  useEffect(() => {
    if (!Array.isArray(exclusions)) setValue("attributes.exclusions", [])
  }, [exclusions, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Coverage">
        <TextInputController control={control} name="attributes.coverage_tier" label="Coverage tier" placeholder="Gold" />
        <NumberInputController control={control} name="attributes.sum_insured" label="Sum insured" />
        <NumberInputController control={control} name="attributes.deductible" label="Deductible" />

        <Controller
          control={control}
          name="attributes.coverage_scope"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Coverage scope</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Medical, baggage" />
            </div>
          )}
        />

        <Controller
          control={control}
          name="attributes.exclusions"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Exclusions</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Extreme sports" />
            </div>
          )}
        />
      </OptionSection>

      <OptionSection title="Eligibility">
        <TextInputController control={control} name="attributes.eligible_travellers" label="Eligible travellers" placeholder="18-70" />
        <NumberInputController control={control} name="attributes.policy_term_days" label="Policy term (days)" />
      </OptionSection>
    </section>
  )
}

function ExtraOptionFields() {
  const { control, setValue, watch } = useFormContext<OptionFormValues>()
  const priceIncludes = watch("attributes.price_includes")
  const incompatible = watch("attributes.stacking_rules.incompatible_with")
  const requires = watch("attributes.stacking_rules.requires")

  useEffect(() => {
    if (!Array.isArray(priceIncludes)) setValue("attributes.price_includes", [])
  }, [priceIncludes, setValue])
  useEffect(() => {
    if (!incompatible || !Array.isArray(incompatible)) setValue("attributes.stacking_rules", { incompatible_with: [], requires: [] })
  }, [incompatible, setValue])
  useEffect(() => {
    if (!requires || !Array.isArray(requires)) {
      setValue("attributes.stacking_rules.requires", [])
    }
  }, [requires, setValue])

  return (
    <section className="space-y-6">
      <OptionSection title="Extra details">
        <TextInputController control={control} name="attributes.extra_variant" label="Extra variant" placeholder="Fast-track immigration" />
        <NumberInputController control={control} name="attributes.fulfilment_window_minutes" label="Fulfilment window (minutes)" />
        <TextInputController control={control} name="attributes.delivery_method" label="Delivery method" placeholder="Meet and greet" />
      </OptionSection>

      <OptionSection title="Inclusions & stacking">
        <Controller
          control={control}
          name="attributes.price_includes"
          render={({ field }) => (
            <div className="grid gap-1">
              <Label className="text-xs uppercase text-muted-foreground">Price includes</Label>
              <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Escort, priority lane" />
            </div>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="attributes.stacking_rules.incompatible_with"
            render={({ field }) => (
              <div className="grid gap-1">
                <Label className="text-xs uppercase text-muted-foreground">Incompatible with</Label>
                <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="VIP meet and greet" />
              </div>
            )}
          />
          <Controller
            control={control}
            name="attributes.stacking_rules.requires"
            render={({ field }) => (
              <div className="grid gap-1">
                <Label className="text-xs uppercase text-muted-foreground">Requires</Label>
                <TagInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder="Base package" />
              </div>
            )}
          />
        </div>
      </OptionSection>
    </section>
  )
}

function RawAttributesFallback() {
  const { watch, setValue } = useFormContext<OptionFormValues>()
  const attributes = watch("attributes")
  const [raw, setRaw] = useState(() => JSON.stringify(attributes ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(JSON.stringify(attributes ?? {}, null, 2))
  }, [attributes])

  const handleApply = () => {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {}
      setValue("attributes", parsed)
      setError(null)
    } catch (err) {
      setError("Invalid JSON")
    }
  }

  return (
    <OptionSection title="Attributes" description="Enter raw JSON for this option when no guided editor is available.">
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

function AdvancedAttributesEditor() {
  const { watch, setValue } = useFormContext<OptionFormValues>()
  const attributes = watch("attributes")
  const [raw, setRaw] = useState(() => JSON.stringify(attributes ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(JSON.stringify(attributes ?? {}, null, 2))
  }, [attributes])

  const handleApply = () => {
    try {
      const parsed = raw.trim() ? JSON.parse(raw) : {}
      setValue("attributes", parsed)
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

function TextInputController({
  control,
  name,
  label,
  placeholder,
}: {
  control: any
  name: string
  label: string
  placeholder?: string
}) {
  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field }) => <TextInputField label={label} placeholder={placeholder} field={field} />}
    />
  )
}

function NumberInputController({ control, name, label }: { control: any; name: string; label: string }) {
  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field }) => <NumberInputField label={label} {...field} />}
    />
  )
}

function TextInputField({
  label,
  placeholder,
  field,
}: {
  label: string
  placeholder?: string
  field: {
    value: any
    onChange: (value: any) => void
  }
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Input value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value)} placeholder={placeholder} />
    </div>
  )
}

function NumberInputField({ label, value, onChange }: { label: string; value: any; onChange: (value: any) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
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

function BooleanField({ control, name, label, description }: { control: any; name: string; label: string; description?: string }) {
  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field }) => (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
            {description ? <p className="text-[11px] text-muted-foreground">{description}</p> : null}
          </div>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  )
}

function DayMaskField({ control, namePrefix, label }: { control: any; namePrefix: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {daysOfWeek.map((day) => (
          <Controller
            key={day}
            control={control}
            name={`${namePrefix}.${day}` as any}
            render={({ field }) => (
              <label className={cn("flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs capitalize")}> 
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

function OptionSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-card/60 p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold leading-none">{title}</h4>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Separator className="opacity-60" />
      <div className="space-y-3">{children}</div>
    </div>
  )
}

