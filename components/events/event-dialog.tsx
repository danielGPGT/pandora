"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { createEvent, updateEvent, setEventImage } from "@/lib/actions/events"
import { useUploadEventImage } from "@/lib/hooks/use-upload-event-image"
import { ImageUploadInput } from "@/components/ui/image-upload-input"
import { eventFormSchema, type EventFormValues } from "@/lib/validators/event"
import { DateRangePicker } from "@/components/protected/DateRangePicker"

const eventStatusOptions: ComboboxOption[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export type EventDialogMode = "create" | "edit"

type EventDialogProps = {
  mode: EventDialogMode
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: {
    id: string
    event_name: string
    event_code: string | null
    event_type: string | null
    venue_name: string | null
    city: string | null
    country: string | null
    event_date_from: string
    event_date_to: string
    event_status: string | null
    description: string | null
    event_image_url: string | null
  }
}

export function EventDialog({ mode, open, onOpenChange, event }: EventDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { upload: uploadImage, isUploading, error: uploadError } = useUploadEventImage()
  const [previewUrl, setPreviewUrl] = useState<string | null>(event?.event_image_url ?? null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const defaultValues = useMemo<EventFormValues>(
    () => ({
      event_name: event?.event_name ?? "",
      event_code: event?.event_code ?? "",
      event_type: event?.event_type ?? "",
      venue_name: event?.venue_name ?? "",
      city: event?.city ?? "",
      country: event?.country ?? "",
      event_date_from: event?.event_date_from ?? new Date().toISOString().slice(0, 10),
      event_date_to:
        event?.event_date_to ?? new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      event_status: event?.event_status ?? "scheduled",
      description: event?.description ?? "",
    }),
    [event]
  )

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  })

  const eventDateFrom = form.watch("event_date_from")
  const eventDateTo = form.watch("event_date_to")

  const dateRangeValue = useMemo<DateRange | undefined>(() => {
    const fromDate = eventDateFrom ? new Date(eventDateFrom) : undefined
    const toDate = eventDateTo ? new Date(eventDateTo) : undefined

    const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined
    const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined

    if (!validFrom && !validTo) return undefined

    return {
      from: validFrom ?? validTo,
      to: validTo,
    }
  }, [eventDateFrom, eventDateTo])

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) {
      form.setValue("event_date_from", "", { shouldDirty: true, shouldValidate: true })
      form.setValue("event_date_to", "", { shouldDirty: true, shouldValidate: true })
      return
    }

    const fromValue = format(range.from, "yyyy-MM-dd")
    const endDate = range.to ?? range.from
    const toValue = format(endDate, "yyyy-MM-dd")

    form.setValue("event_date_from", fromValue, { shouldDirty: true, shouldValidate: true })
    form.setValue("event_date_to", toValue, { shouldDirty: true, shouldValidate: true })
  }

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(event?.event_image_url ?? null)
      setSelectedFile(null)
      setImageRemoved(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, open])

  useEffect(() => {
    if (open) {
      return () => {
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl)
        }
      }
    }
  }, [open, previewUrl])

  const resetMediaState = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(event?.event_image_url ?? null)
    setSelectedFile(null)
    setImageRemoved(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues)
      resetMediaState()
    }
    onOpenChange(next)
  }

  const onSubmit = (values: EventFormValues) => {
    setIsSubmitting(true)
    startTransition(async () => {
      try {
        const payload: EventFormValues = {
          ...values,
          event_code: values.event_code?.trim() ? values.event_code.trim() : null,
          event_type: values.event_type?.trim() ? values.event_type.trim() : null,
          venue_name: values.venue_name?.trim() ? values.venue_name.trim() : null,
          city: values.city?.trim() ? values.city.trim() : null,
          country: values.country?.trim() ? values.country.trim().toUpperCase() : null,
          event_status: values.event_status?.trim() ? values.event_status.trim() : "scheduled",
          description: values.description?.trim() ? values.description.trim() : null,
        }
        if (mode === "create") {
          const created = await createEvent(payload)
          if (selectedFile) {
            const uploaded = await uploadImage(created.id, selectedFile)
            if (uploaded) {
              await setEventImage(created.id, uploaded)
              setPreviewUrl(uploaded)
            }
          }
          toast.success("Event created")
          setSelectedFile(null)
          setImageRemoved(false)
        } else if (event) {
          await updateEvent(event.id, payload)
          if (selectedFile) {
            const uploaded = await uploadImage(event.id, selectedFile)
            if (uploaded) {
              await setEventImage(event.id, uploaded)
              setPreviewUrl(uploaded)
            }
          } else if (imageRemoved && event.event_image_url) {
            await setEventImage(event.id, null)
            setPreviewUrl(null)
          }
          toast.success("Event updated")
          setSelectedFile(null)
          setImageRemoved(false)
        }
        router.refresh()
        handleOpenChange(false)
      } catch (err) {
        toast.error("Failed to save event", {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const title = mode === "create" ? "Create event" : "Edit event"
  const description = mode === "create" ? "Add a new event to your inventory." : "Update event details and scheduling."

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          id="event-dialog-form"
        >
          <input type="hidden" {...form.register("event_date_from")}
          />
          <input type="hidden" {...form.register("event_date_to")}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-name">Event name</Label>
              <Input id="event-name" placeholder="Grand Prix" {...form.register("event_name")} />
              {form.formState.errors.event_name ? (
                <p className="text-xs text-destructive">{form.formState.errors.event_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-code">Event code</Label>
              <Input id="event-code" placeholder="GP-2025" {...form.register("event_code")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event type</Label>
              <Input id="event-type" placeholder="Sport, Festival, ..." {...form.register("event_type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-status">Event status</Label>
              <Combobox
                id="event-status"
                options={eventStatusOptions}
                value={(form.watch("event_status") as string | null) ?? null}
                onChange={(value) => form.setValue("event_status", value ?? null)}
                placeholder="Select status"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status"
                clearable
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue-name">Venue</Label>
              <Input id="venue-name" placeholder="Circuit de Monaco" {...form.register("venue_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Monaco" {...form.register("city")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country (ISO 2-letter)</Label>
            <Input id="country" placeholder="MC" {...form.register("country")} />
            {form.formState.errors.country ? (
              <p className="text-xs text-destructive">{form.formState.errors.country.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <DateRangePicker
              label="Event dates"
              placeholder="Select start and end dates"
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              required
            />
            {form.formState.errors.event_date_from ? (
              <p className="text-xs text-destructive">{form.formState.errors.event_date_from.message}</p>
            ) : form.formState.errors.event_date_to ? (
              <p className="text-xs text-destructive">{form.formState.errors.event_date_to.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} placeholder="Optional notes" {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Event image</Label>
            <ImageUploadInput
              value={previewUrl}
              onChange={(file, preview) => {
                if (previewUrl && previewUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(previewUrl)
                }
                setSelectedFile(file)
                setPreviewUrl(preview)
                setImageRemoved(!file && !preview)
              }}
              description="Upload an image for the event."
              disabled={isSubmitting || isUploading}
            />
            {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending || isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button type="submit" form="event-dialog-form" disabled={isPending || isSubmitting || isUploading}>
            {isSubmitting || isUploading ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


