import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

async function getCurrentOrganizationId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  const { data: appUser } = await supabase
    .from("users")
    .select("organization_id,is_active")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (appUser?.organization_id && appUser.is_active !== false) {
    return appUser.organization_id as string
  }

  return null
}

export type EventOption = {
  id: string
  event_name: string
  event_code: string | null
  event_date_from: string | null
  event_date_to: string | null
}

export async function getEventsForSelect(): Promise<EventOption[]> {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id,event_name,event_code,event_date_from,event_date_to")
    .eq("organization_id", organizationId)
    .order("event_date_from", { ascending: true })

  if (error) {
    console.error("getEventsForSelect error", error)
    return []
  }

  return data ?? []
}

const sortKeys = ["event_name", "event_code", "event_date_from", "event_date_to", "created_at", "updated_at"] as const
type SortKey = typeof sortKeys[number]

export const eventsQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .default(10),
  sort: z.enum(sortKeys).optional().default("event_date_from"),
  dir: z.enum(["asc", "desc"]).optional().default("asc"),
  status: z.string().trim().optional(),
})

export type EventsQuery = z.infer<typeof eventsQuerySchema>

export async function getEventsPage(params: EventsQuery) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)

  if (params.q) {
    const q = `%${params.q}%`
    query = query.or(
      `event_name.ilike.${q},event_code.ilike.${q},event_type.ilike.${q},venue_name.ilike.${q},city.ilike.${q},country.ilike.${q}`
    )
  }

  if (params.status && params.status.length > 0) {
    query = query.eq("event_status", params.status)
  }

  query = query.order(params.sort as SortKey, { ascending: params.dir === "asc" })

  const { data, error, count } = await query.range(from, to)

  if (error) throw new Error(error.message)

  return {
    rows: data ?? [],
    total: count ?? 0,
  }
}

export async function getEventsSummary() {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) throw new Error("Unauthorized")

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [upcomingRes, ongoingRes, pastRes] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gt("event_date_from", today),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .lte("event_date_from", today)
      .gte("event_date_to", today),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .lt("event_date_to", today),
  ])

  return {
    upcoming: upcomingRes.count ?? 0,
    ongoing: ongoingRes.count ?? 0,
    past: pastRes.count ?? 0,
  }
}

