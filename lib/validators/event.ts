import { z } from "zod"

export const eventFormSchema = z
  .object({
    event_name: z.string().min(1, "Event name is required"),
    event_code: z.string().max(50).optional().nullable(),
    event_type: z.string().max(50).optional().nullable(),
    venue_name: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    country: z
      .string()
      .max(2, "Use ISO country code")
      .optional()
      .nullable(),
    event_date_from: z.string().min(1, "Start date required"),
    event_date_to: z.string().min(1, "End date required"),
    event_status: z.string().max(20).optional().nullable(),
    description: z.string().optional().nullable(),
  })
  .refine((values) => new Date(values.event_date_from) <= new Date(values.event_date_to), {
    path: ["event_date_to"],
    message: "End date must be after start date",
  })

export type EventFormValues = z.infer<typeof eventFormSchema>

export function normalizeEventPayload(values: EventFormValues) {
  const payload: Record<string, any> = { ...values }
  payload.event_code = values.event_code ? values.event_code.trim().toUpperCase() : null
  payload.event_type = values.event_type?.trim() || null
  payload.venue_name = values.venue_name?.trim() || null
  payload.city = values.city?.trim() || null
  payload.country = values.country ? values.country.trim().toUpperCase().slice(0, 2) : null
  payload.event_status = values.event_status?.trim() || "scheduled"
  payload.description = values.description?.trim() || null
  payload.event_date_from = values.event_date_from
  payload.event_date_to = values.event_date_to
  return payload
}


