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
  }>
  counts: {
    options: number
    sellingRates: number
    supplierRates: number
    bookings: number
  }
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

  const [{ data: optionsData, error: optionsError }, sellingRatesRes, supplierRatesRes, bookingsRes] = await Promise.all([
    supabase
      .from("product_options")
      .select("id, option_name, option_code, description, attributes, is_active, sort_order, created_at, updated_at")
      .eq("product_id", id)
      .order("sort_order", { ascending: true, nullsFirst: true }),
    supabase
      .from("selling_rates")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("organization_id", organization_id),
    supabase
      .from("supplier_rates")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("organization_id", organization_id),
    supabase
      .from("booking_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("organization_id", organization_id),
  ])

  if (optionsError) {
    console.error("getProductDetails options error", optionsError)
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
  }))

  const counts = {
    options: options.length,
    sellingRates: sellingRatesRes.count ?? 0,
    supplierRates: supplierRatesRes.count ?? 0,
    bookings: bookingsRes.count ?? 0,
  }

  return { product, options, counts }
}


