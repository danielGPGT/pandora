import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

export async function getProductById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("getProductById error", error)
    throw error
  }

  return data
}

const sortKeys = ["name", "code", "created_at", "updated_at"] as const
type SortKey = typeof sortKeys[number]

export const productsQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(5)
    .max(100)
    .default(10),
  sort: z.enum(sortKeys).optional().default("created_at"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
  is_active: z.union([z.literal("true"), z.literal("false")]).optional(),
  product_type: z.string().uuid().optional(),
})

export type ProductsQuery = z.infer<typeof productsQuerySchema>

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

export async function getProductsPage(params: ProductsQuery) {
  const organization_id = await getCurrentOrganizationId()
  if (!organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()
  const from = (params.page - 1) * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase
    .from("products")
    .select(
      `
        *,
        product_type:product_types (
          id,
          type_name,
          type_code
        ),
        event:events (
          id,
          event_name,
          event_code,
          event_date_from,
          event_date_to
        )
      `,
      { count: "exact" }
    )
    .eq("organization_id", organization_id)

  if (params.q) {
    const q = `%${params.q}%`
    query = query.or(`name.ilike.${q},code.ilike.${q},description.ilike.${q}`)
  }

  if (params.product_type) {
    query = query.eq("product_type_id", params.product_type)
  }

  if (params.is_active) {
    query = query.eq("is_active", params.is_active === "true")
  }

  query = query.order(params.sort as SortKey, { ascending: params.dir === "asc" })

  const { data, error, count } = await query.range(from, to)

  if (error) throw new Error(error.message)

  return {
    rows: data ?? [],
    total: count ?? 0,
  }
}

export async function getProductSummary() {
  const organization_id = await getCurrentOrganizationId()
  if (!organization_id) throw new Error("Unauthorized")

  const supabase = await createClient()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [activeRes, inactiveRes, newRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organization_id).eq("is_active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("is_active", false),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .gte("created_at", monthStart),
  ])

  return {
    active: activeRes.count ?? 0,
    inactive: inactiveRes.count ?? 0,
    newThisMonth: newRes.count ?? 0,
  }
}

export type SellingRateDetails = {
  id: string
  option_id: string | null
  rate_name: string | null
  rate_basis: string
  pricing_model: string
  valid_from: string
  valid_to: string
  base_price: number
  currency: string
  markup_type: string | null
  markup_amount: number | null
  pricing_details: Record<string, any>
  is_active: boolean
  target_cost: number | null
  created_at: string
  updated_at: string
}

export type ProductDetailsResult = {
  product: {
    id: string
    organization_id: string
    product_type_id: string
    name: string
    code: string
    description: string | null
    location: Record<string, any> | null
    attributes: Record<string, any>
    event_id: string | null
    is_active: boolean | null
    created_at: string
    updated_at: string
    created_by: string | null
    media: string[]
    tags: string[]
    product_type: {
      id: string
      type_name: string
      type_code: string | null
      description: string | null
      icon: string | null
    } | null
    event: {
      id: string
      event_name: string
      event_code: string | null
      event_date_from: string | null
      event_date_to: string | null
      event_status: string | null
      venue_name: string | null
      city: string | null
      country: string | null
    } | null
    created_by_user: {
      id: string
      first_name: string | null
      last_name: string | null
      email: string | null
    } | null
  }
  options: Array<{
    id: string
    option_name: string
    option_code: string
    description: string | null
    attributes: Record<string, any>
    is_active: boolean | null
    sort_order: number | null
    created_at: string
    updated_at: string
    selling_rate_count: number
    supplier_rate_count: number
    allocation_count: number
    upcoming_booking_count: number
    selling_rates: SellingRateDetails[]
  }>
  counts: {
    options: number
    optionsActive: number
    sellingRates: number
    supplierRates: number
    allocations: number
    bookings: number
  }
  productSellingRates: SellingRateDetails[]
}

export async function getProductDetails(id: string): Promise<ProductDetailsResult | null> {
  const organization_id = await getCurrentOrganizationId()
  if (!organization_id) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        product_type:product_types (
          id,
          type_name,
          type_code,
          description,
          icon
        ),
        event:events (
          id,
          event_name,
          event_code,
          event_date_from,
          event_date_to,
          event_status,
          venue_name,
          city,
          country
        ),
        created_by_user:users (
          id,
          first_name,
          last_name,
          email
        )
      `
    )
    .eq("organization_id", organization_id)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("getProductDetails error", error)
    throw error
  }

  if (!data) {
    return null
  }

  const [
    { data: optionsData, error: optionsError },
    sellingRatesRes,
    supplierRatesRes,
    bookingItemsRes,
    allocationsRes,
  ] = await Promise.all([
    supabase
      .from("product_options")
      .select("id, option_name, option_code, description, attributes, is_active, sort_order, created_at, updated_at")
      .eq("product_id", id)
      .order("sort_order", { ascending: true, nullsFirst: true }),
    supabase
      .from("selling_rates")
      .select(
        "id, product_option_id, rate_name, rate_basis, pricing_model, valid_from, valid_to, base_price, currency, markup_type, markup_amount, pricing_details, is_active, target_cost, created_at, updated_at"
      )
      .eq("product_id", id)
      .eq("organization_id", organization_id),
    supabase
      .from("supplier_rates")
      .select("id, product_option_id")
      .eq("product_id", id)
      .eq("organization_id", organization_id),
    supabase
      .from("booking_items")
      .select("id, product_option_id, service_date_from")
      .eq("product_id", id)
      .eq("organization_id", organization_id),
    supabase
      .from("contract_allocations")
      .select("id, product_option_id")
      .eq("product_id", id)
      .eq("organization_id", organization_id),
  ])

  if (optionsError) {
    console.error("getProductDetails options error", optionsError)
  }

  const sellingRatesData = sellingRatesRes.data ?? []
  const supplierRatesData = supplierRatesRes.data ?? []
  const bookingItemsData = bookingItemsRes.data ?? []
  const allocationsData = allocationsRes.data ?? []

  type SellingRateRow = NonNullable<typeof sellingRatesData>[number]

  const sellingRateCounts = new Map<string, number>()
  const sellingRatesByOption = new Map<string | null, Array<{ id: string; option_id: string | null; rate_name: string | null; rate_basis: string; pricing_model: string; valid_from: string; valid_to: string; base_price: number; currency: string; markup_type: string | null; markup_amount: number | null; pricing_details: Record<string, any>; is_active: boolean; target_cost: number | null; created_at: string; updated_at: string }>>()

  const normalizeRate = (rate: SellingRateRow) => {
    const pricingDetails =
      rate.pricing_details && typeof rate.pricing_details === "object" && !Array.isArray(rate.pricing_details)
        ? (rate.pricing_details as Record<string, any>)
        : {}

    return {
      id: rate.id,
      option_id: rate.product_option_id ?? null,
      rate_name: rate.rate_name ?? null,
      rate_basis: rate.rate_basis,
      pricing_model: rate.pricing_model,
      valid_from: rate.valid_from,
      valid_to: rate.valid_to,
      base_price: Number(rate.base_price),
      currency: rate.currency,
      markup_type: rate.markup_type ?? null,
      markup_amount: rate.markup_amount !== null ? Number(rate.markup_amount) : null,
      pricing_details: pricingDetails,
      is_active: rate.is_active ?? true,
      target_cost: rate.target_cost !== null ? Number(rate.target_cost) : null,
      created_at: rate.created_at,
      updated_at: rate.updated_at,
    }
  }

  for (const rate of sellingRatesData) {
    const normalized = normalizeRate(rate as SellingRateRow)
    const optionKey = normalized.option_id

    const current = sellingRatesByOption.get(optionKey) ?? []
    current.push(normalized)
    sellingRatesByOption.set(optionKey, current)

    if (normalized.option_id) {
      sellingRateCounts.set(normalized.option_id, (sellingRateCounts.get(normalized.option_id) ?? 0) + 1)
    }
  }

  const supplierRateCounts = new Map<string, number>()
  for (const rate of supplierRatesData) {
    if (!rate.product_option_id) continue
    supplierRateCounts.set(rate.product_option_id, (supplierRateCounts.get(rate.product_option_id) ?? 0) + 1)
  }

  const allocationCounts = new Map<string, number>()
  for (const allocation of allocationsData) {
    if (!allocation.product_option_id) continue
    allocationCounts.set(allocation.product_option_id, (allocationCounts.get(allocation.product_option_id) ?? 0) + 1)
  }

  const now = new Date()
  const upcomingBookingCounts = new Map<string, number>()
  for (const booking of bookingItemsData) {
    if (!booking.product_option_id) continue
    const serviceDate = booking.service_date_from ? new Date(booking.service_date_from) : null
    if (serviceDate && serviceDate >= now) {
      upcomingBookingCounts.set(
        booking.product_option_id,
        (upcomingBookingCounts.get(booking.product_option_id) ?? 0) + 1
      )
    }
  }

  const product = {
    id: data.id,
    organization_id: data.organization_id,
    product_type_id: data.product_type_id,
    name: data.name,
    code: data.code,
    description: data.description ?? null,
    location: (data.location && Object.keys(data.location ?? {}).length ? data.location : null) as Record<string, any> | null,
    attributes: (data.attributes ?? {}) as Record<string, any>,
    event_id: data.event_id ?? null,
    is_active: data.is_active ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: data.created_by ?? null,
    media: Array.isArray(data.media) ? (data.media as string[]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    product_type: data.product_type ?? null,
    event: data.event ?? null,
    created_by_user: data.created_by_user ?? null,
  }

  const options = (optionsData ?? []).map((option) => ({
    id: option.id,
    option_name: option.option_name,
    option_code: option.option_code,
    description: option.description ?? null,
    attributes: (option.attributes ?? {}) as Record<string, any>,
    is_active: option.is_active ?? null,
    sort_order: option.sort_order ?? null,
    created_at: option.created_at,
    updated_at: option.updated_at,
    selling_rate_count: sellingRateCounts.get(option.id) ?? 0,
    supplier_rate_count: supplierRateCounts.get(option.id) ?? 0,
    allocation_count: allocationCounts.get(option.id) ?? 0,
    upcoming_booking_count: upcomingBookingCounts.get(option.id) ?? 0,
    selling_rates: sellingRatesByOption.get(option.id) ?? [],
  }))

  const counts = {
    options: options.length,
    optionsActive: options.filter((option) => option.is_active).length,
    sellingRates: sellingRatesData.length,
    supplierRates: supplierRatesData.length,
    allocations: allocationsData.length,
    bookings: bookingItemsData.length,
  }

  const productSellingRates = sellingRatesByOption.get(null) ?? []

  return { product, options, counts, productSellingRates }
}


