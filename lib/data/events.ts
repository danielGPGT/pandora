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

export type EventProductSummary = {
  id: string
  name: string
  code: string | null
  is_active: boolean
  updated_at: string
  product_type?: {
    id: string
    type_name: string | null
    type_code: string | null
  } | null
}

export type EventContractSummary = {
  id: string
  contract_name: string | null
  contract_number: string
  status: string | null
  valid_from: string
  valid_to: string
  supplier?: {
    id: string
    name: string | null
    code: string | null
  } | null
}

export type EventBookingSummary = {
  id: string
  booking_id: string
  service_date_from: string
  service_date_to: string | null
  quantity: number | null
  total_price: number | null
  total_price_base: number | null
  price_currency: string | null
  item_status: string | null
  product?: {
    id: string
    name: string | null
    code: string | null
  } | null
  booking?: {
    id: string
    booking_reference: string | null
    booking_status: string | null
    travel_date_from: string | null
    travel_date_to: string | null
    lead_passenger_name: string | null
  } | null
}

export type EventAuditLogEntry = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  changed_by: string | null
  changed_at: string
  changed_by_user?: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

export type EventDetailsResult = {
  event: {
    id: string
    organization_id: string | null
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
    created_at: string
    updated_at: string
  }
  counts: {
    productsTotal: number
    productsActive: number
    contractsTotal: number
    contractsActive: number
    upcomingServices: number
    totalRevenue: number
    revenueCurrency: string | null
  }
  products: EventProductSummary[]
  contracts: EventContractSummary[]
  bookings: EventBookingSummary[]
  auditLog: EventAuditLogEntry[]
  loadErrors: {
    products: boolean
    contracts: boolean
    bookings: boolean
    auditLog: boolean
    counts: boolean
  }
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

export async function getEventDetails(eventId: string): Promise<EventDetailsResult | null> {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return null
  }

  const supabase = await createClient()

  const logPostgrestError = (context: string, error: any) => {
    if (!error) return

    const payload = {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }

    if (error.code === "42704") {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[EventDetails] ${context} relation missing`, payload)
      }
      return
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[EventDetails] ${context} query error`, payload)
    }
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) {
    console.error("getEventDetails event error", eventError)
    throw eventError
  }

  if (!event) {
    return null
  }

  const today = new Date().toISOString().slice(0, 10)

  const [productsRes, activeProductsRes, contractsRes, activeContractsRes, bookingsRes, auditLogRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          name,
          code,
          is_active,
          updated_at,
          product_type:product_types (
            id,
            type_name,
            type_code
          )
        `,
        { count: "exact" }
      )
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("is_active", true),
    supabase
      .from("contracts")
      .select(
        `
          id,
          contract_name,
          contract_number,
          status,
          valid_from,
          valid_to,
          supplier:suppliers (
            id,
            name,
            code
          )
        `,
        { count: "exact" }
      )
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .order("valid_from", { ascending: true })
      .limit(6),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("status", "active"),
    supabase
      .from("booking_items")
      .select(
        `
          id,
          booking_id,
          service_date_from,
          service_date_to,
          quantity,
          total_price,
          total_price_base,
          price_currency,
          item_status,
          product:products!booking_items_product_id_fkey (
            id,
            name,
            code,
            event_id
          ),
          booking:bookings (
            id,
            booking_reference,
            booking_status,
            travel_date_from,
            travel_date_to,
            lead_passenger_name
          )
        `
      )
      .eq("organization_id", organizationId)
      .eq("product.event_id", eventId)
      .gte("service_date_from", today)
      .order("service_date_from", { ascending: true })
      .limit(8),
    supabase
      .from("audit_log")
      .select(
        `
          id,
          entity_type,
          entity_id,
          action,
          old_values,
          new_values,
          changed_by,
          changed_at,
          changed_by_user:users!audit_log_changed_by_fkey (
            id,
            email,
            first_name,
            last_name
          )
        `
      )
      .eq("organization_id", organizationId)
      .eq("entity_type", "event")
      .eq("entity_id", eventId)
      .order("changed_at", { ascending: false })
      .limit(20),
  ])

  logPostgrestError("products", productsRes.error)
  logPostgrestError("active_products", activeProductsRes.error)
  logPostgrestError("contracts", contractsRes.error)
  logPostgrestError("active_contracts", activeContractsRes.error)
  logPostgrestError("bookings", bookingsRes.error)
  logPostgrestError("audit_log", auditLogRes.error)

  const products: EventProductSummary[] = (productsRes.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code ?? null,
    is_active: Boolean(product.is_active),
    updated_at: product.updated_at,
    product_type: product.product_type ?? null,
  }))

  const contracts: EventContractSummary[] = (contractsRes.data ?? []).map((contract) => ({
    id: contract.id,
    contract_name: contract.contract_name ?? null,
    contract_number: contract.contract_number,
    status: contract.status ?? null,
    valid_from: contract.valid_from,
    valid_to: contract.valid_to,
    supplier: contract.supplier ?? null,
  }))

  const bookings: EventBookingSummary[] = (bookingsRes.data ?? [])
    .filter((booking) => booking.product?.event_id === eventId)
    .map((booking) => ({
      id: booking.id,
      booking_id: booking.booking_id,
      service_date_from: booking.service_date_from,
      service_date_to: booking.service_date_to ?? null,
      quantity: booking.quantity ?? null,
      total_price: booking.total_price ?? null,
      total_price_base: booking.total_price_base ?? null,
      price_currency: booking.price_currency ?? null,
      item_status: booking.item_status ?? null,
      product: booking.product
        ? {
            id: booking.product.id,
            name: booking.product.name ?? null,
            code: booking.product.code ?? null,
          }
        : undefined,
      booking: booking.booking
        ? {
            id: booking.booking.id,
            booking_reference: booking.booking.booking_reference ?? null,
            booking_status: booking.booking.booking_status ?? null,
            travel_date_from: booking.booking.travel_date_from ?? null,
            travel_date_to: booking.booking.travel_date_to ?? null,
            lead_passenger_name: booking.booking.lead_passenger_name ?? null,
          }
        : undefined,
    }))

  const auditLog: EventAuditLogEntry[] = (auditLogRes.data ?? []) as EventAuditLogEntry[]

  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price_base ?? booking.total_price ?? 0), 0)
  const revenueCurrency = bookings.find((booking) => booking.price_currency)?.price_currency ?? null

  const counts = {
    productsTotal: productsRes.count ?? 0,
    productsActive: activeProductsRes.error ? products.filter((product) => product.is_active).length : activeProductsRes.count ?? 0,
    contractsTotal: contractsRes.count ?? 0,
    contractsActive: activeContractsRes.error
      ? contracts.filter((contract) => (contract.status ?? "").toLowerCase() === "active").length
      : activeContractsRes.count ?? 0,
    upcomingServices: bookings.length,
    totalRevenue,
    revenueCurrency,
  }

  const loadErrors = {
    products: !!productsRes.error,
    contracts: !!contractsRes.error,
    bookings: !!bookingsRes.error,
    auditLog: !!auditLogRes.error,
    counts: !!activeProductsRes.error || !!activeContractsRes.error,
  }

  return {
    event: {
      id: event.id,
      organization_id: event.organization_id,
      event_name: event.event_name,
      event_code: event.event_code ?? null,
      event_type: event.event_type ?? null,
      venue_name: event.venue_name ?? null,
      city: event.city ?? null,
      country: event.country ?? null,
      event_date_from: event.event_date_from,
      event_date_to: event.event_date_to,
      event_status: event.event_status ?? null,
      description: event.description ?? null,
      event_image_url: event.event_image_url ?? null,
      created_at: event.created_at,
      updated_at: event.updated_at,
    },
    counts,
    products,
    contracts,
    bookings,
    auditLog,
    loadErrors,
  }
}

