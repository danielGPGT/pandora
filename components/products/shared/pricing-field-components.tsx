/**
 * Reusable field components for pricing forms
 * 
 * Shared components following the same pattern as product option attributes
 */

"use client"

import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ============================================================================
// Text Input Field
// ============================================================================

interface TextInputFieldProps {
  label: string
  description?: string
  placeholder?: string
  field: {
    value: any
    onChange: (value: any) => void
  }
}

export function TextInputField({ label, description, placeholder, field }: TextInputFieldProps) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <Input
        value={field.value ?? ""}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

// ============================================================================
// Number Input Field
// ============================================================================

interface NumberInputFieldProps {
  label: string
  description?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  value: any
  onChange: (value: any) => void
}

export function NumberInputField({
  label,
  description,
  placeholder,
  min,
  max,
  step = 1,
  value,
  onChange,
}: NumberInputFieldProps) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(event) => {
          const numeric = event.target.value
          onChange(numeric === "" ? undefined : Number(numeric))
        }}
        placeholder={placeholder}
      />
    </div>
  )
}

// ============================================================================
// Textarea Field
// ============================================================================

interface TextareaFieldProps {
  label: string
  description?: string
  placeholder?: string
  rows?: number
  field: {
    value: any
    onChange: (value: any) => void
  }
}

export function TextareaField({ label, description, placeholder, rows = 3, field }: TextareaFieldProps) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <Textarea
        rows={rows}
        value={field.value ?? ""}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

// ============================================================================
// Day Mask Field (for weekend pricing)
// ============================================================================

interface DayMaskFieldProps {
  control: any
  namePrefix: string
  label: string
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

export function DayMaskField({ control, namePrefix, label }: DayMaskFieldProps) {
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
              <label className={cn("flex items-center gap-2 text-xs capitalize cursor-pointer")}>
                <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                {day.replace("_", " ")}
              </label>
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Option Section (for grouping fields)
// ============================================================================

interface OptionSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function OptionSection({ title, description, children }: OptionSectionProps) {
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

