"use client"

import { useMemo } from "react"
import { useFormContext, Controller } from "react-hook-form"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export const productTypeAttributeMap: Record<string, AttributeField[]> = {
  accommodation: [
    { path: "accommodation.star_rating", label: "Star rating", type: "number" },
    { path: "accommodation.check_in_time", label: "Check-in time", placeholder: "15:00" },
    { path: "accommodation.check_out_time", label: "Check-out time", placeholder: "11:00" },
    { path: "accommodation.amenities", label: "Amenities", type: "multiline" },
    { path: "accommodation.highlights", label: "Highlights", type: "multiline" },
  ],
  transfer: [
    { path: "transfer.vehicle_type", label: "Vehicle type" },
    { path: "transfer.capacity", label: "Capacity", type: "number" },
    { path: "transfer.pickup_points", label: "Pickup points", type: "multiline" },
    { path: "transfer.dropoff_points", label: "Dropoff points", type: "multiline" },
    { path: "transfer.transfer_type", label: "Transfer type" },
  ],
  event: [
    { path: "event.ticket_type", label: "Ticket type" },
    { path: "event.delivery_days", label: "Delivery days", type: "number" },
    { path: "event.features", label: "Features", type: "multiline" },
  ],
  meal: [
    { path: "meal.cuisine", label: "Cuisine" },
    { path: "meal.meal_time", label: "Meal time" },
    { path: "meal.service_style", label: "Service style" },
    { path: "meal.dietary_notes", label: "Dietary notes", type: "multiline" },
    { path: "meal.beverages_included", label: "Beverages included", type: "boolean" },
    { path: "meal.inclusions", label: "Inclusions", type: "multiline" },
  ],
  experience: [
    { path: "experience.duration_minutes", label: "Duration (minutes)", type: "number" },
    { path: "experience.difficulty", label: "Difficulty" },
    { path: "experience.highlights", label: "Highlights", type: "multiline" },
    { path: "experience.equipment_included", label: "Equipment included", type: "multiline" },
    { path: "experience.equipment_required", label: "Equipment required", type: "multiline" },
    { path: "experience.languages", label: "Languages", type: "multiline" },
  ],
  equipment: [
    { path: "equipment.equipment_type", label: "Equipment type" },
    { path: "equipment.brand", label: "Brand" },
    { path: "equipment.model", label: "Model" },
    { path: "equipment.size", label: "Size / dimensions" },
    { path: "equipment.rental_terms", label: "Rental terms", type: "multiline" },
    { path: "equipment.safety_notes", label: "Safety notes", type: "multiline" },
  ],
  service: [
    { path: "service.service_type", label: "Service type" },
    { path: "service.service_area", label: "Service area" },
    { path: "service.lead_time_hours", label: "Lead time (hours)", type: "number" },
    { path: "service.coverage_hours", label: "Coverage hours" },
    { path: "service.included_items", label: "Included items", type: "multiline" },
    { path: "service.exclusions", label: "Exclusions", type: "multiline" },
  ],
  insurance: [
    { path: "insurance.policy_type", label: "Policy type" },
    { path: "insurance.coverage_limit", label: "Coverage limit", type: "number" },
    { path: "insurance.deductible", label: "Deductible", type: "number" },
    { path: "insurance.coverage_scope", label: "Coverage scope", type: "multiline" },
    { path: "insurance.exclusions", label: "Exclusions", type: "multiline" },
    { path: "insurance.provider_terms_url", label: "Provider terms URL" },
  ],
  extra: [
    { path: "extra.extra_type", label: "Extra type" },
    { path: "extra.description", label: "Description", type: "textarea" },
    { path: "extra.inclusions", label: "Inclusions", type: "multiline" },
    { path: "extra.delivery_method", label: "Delivery method" },
  ],
}

type AttributeField = {
  path: string
  label: string
  placeholder?: string
  type?: "number" | "textarea" | "multiline" | "boolean"
}

export function ProductAttributeEditor({ productTypeKey }: { productTypeKey: string }) {
  const { control } = useFormContext()
  const fields = useMemo(() => productTypeAttributeMap[productTypeKey] ?? [], [productTypeKey])

  if (!fields.length) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        No structured attribute hints for this product type yet. Use the Advanced JSON tab to supply custom data.
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible defaultValue="attributes">
      <AccordionItem value="attributes">
        <AccordionTrigger className="text-base font-semibold">Type-specific fields</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          {fields.map((field) => (
            <Controller
              key={field.path}
              control={control}
              name={`attributes.${field.path}` as const}
              render={({ field: controllerField }) => (
                <div className="grid gap-2">
                  <Label>{field.label}</Label>
                  {renderAttributeInput({ field, controllerField })}
                </div>
              )}
            />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function renderAttributeInput({
  field,
  controllerField,
}: {
  field: AttributeField
  controllerField: ReturnType<typeof useFormContext>["control"] extends infer T
    ? T extends { register: never }
      ? never
      : any
    : never
}) {
  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={controllerField.value ?? ""}
        placeholder={field.placeholder}
        onChange={(event) => controllerField.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
      />
    )
  }

  if (field.type === "textarea") {
    return <Textarea value={controllerField.value ?? ""} onChange={(event) => controllerField.onChange(event.target.value)} rows={5} />
  }

  if (field.type === "multiline") {
    return (
      <Textarea
        value={Array.isArray(controllerField.value) ? controllerField.value.join("\n") : controllerField.value ?? ""}
        onChange={(event) => controllerField.onChange(event.target.value.split("\n").filter(Boolean))}
        placeholder="Enter one item per line"
        rows={5}
      />
    )
  }

  if (field.type === "boolean") {
    return <Switch checked={Boolean(controllerField.value)} onCheckedChange={controllerField.onChange} />
  }

  return <Input value={controllerField.value ?? ""} placeholder={field.placeholder} onChange={(event) => controllerField.onChange(event.target.value)} />
}
