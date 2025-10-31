import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type Nullable<T> = T | null

type RelatedUser = {
  id: string
  email: Nullable<string>
  first_name: Nullable<string>
  last_name: Nullable<string>
}

type RelatedSupplier = {
  id: string
  name: string
  code: Nullable<string>
  email: Nullable<string>
  phone: Nullable<string>
}

type RelatedEvent = {
  id: string
  event_name: string
  event_code: Nullable<string>
  event_date_from: Nullable<string>
  event_date_to: Nullable<string>
  city: Nullable<string>
  country: Nullable<string>
}

type AllocationRelease = {
  id: string
  contract_allocation_id: string
  release_date: string
  release_percentage: Nullable<number>
  release_quantity: Nullable<number>
  penalty_applies: Nullable<boolean>
  notes: Nullable<string>
}

type AvailabilityRow = {
  id: string
  contract_allocation_id: string
  date: string
  total_available: number
  booked: number
  available: number
  is_closed: Nullable<boolean>
}

type RawContractAllocation = {
  id: string
  allocation_name: Nullable<string>
  allocation_type: Nullable<string>
  total_quantity: Nullable<number>
  valid_from: string
  valid_to: string
  notes: Nullable<string>
  product_id: Nullable<string>
  product_option_id: Nullable<string>
}

type RawSupplierRate = {
  id: string
  rate_name: Nullable<string>
  rate_basis: string
  valid_from: string
  valid_to: string
  base_cost: Nullable<number>
  currency: string
  markup_type: Nullable<string>
  markup_amount: Nullable<number>
  pricing_details: Nullable<Record<string, any>>
  is_active: Nullable<boolean>
  product_id: Nullable<string>
  product_option_id: Nullable<string>
  contract_allocation_id: Nullable<string>
}

type RawBookingItem = {
  id: string
  booking_id: string
  service_date_from: Nullable<string>
  service_date_to: Nullable<string>
  nights: Nullable<number>
  quantity: Nullable<number>
  total_price: Nullable<number>
  price_currency: Nullable<string>
}

type ProductRecord = {
  id: string
  name: string
  code: Nullable<string>
  product_type_id: Nullable<string>
}

type ProductOptionRecord = {
  id: string
  option_name: string
  option_code: Nullable<string>
}

type ProductTypeRecord = {
  id: string
  type_name: string
  type_code: string
}

type BookingRecord = {
  id: string
  booking_reference: string
  booking_status: Nullable<string>
  travel_date_from: Nullable<string>
  travel_date_to: Nullable<string>
}

type ContractAllocationRecord = {
  id: string
  allocation_name: Nullable<string>
  allocation_type: Nullable<string>
  total_quantity: Nullable<number>
  valid_from: string
  valid_to: string
  notes: Nullable<string>
  product: Nullable<{
    id: string
    name: string
    code: Nullable<string>
    product_type: Nullable<{
      id: string
      type_name: string
      type_code: string
    }>
  }>
  product_option: Nullable<{
    id: string
    option_name: string
    option_code: Nullable<string>
  }>
  releases: AllocationRelease[]
}

type SupplierRateRecord = {
  id: string
  rate_name: Nullable<string>
  rate_basis: string
  valid_from: string
  valid_to: string
  base_cost: Nullable<number>
  currency: string
  markup_type: Nullable<string>
  markup_amount: Nullable<number>
  pricing_details: Nullable<Record<string, any>>
  is_active: Nullable<boolean>
  product: Nullable<{ id: string; name: string; code: Nullable<string> }>
  product_option: Nullable<{ id: string; option_name: string; option_code: Nullable<string> }>
  contract_allocation: Nullable<{ id: string; allocation_name: Nullable<string> }>
}

type BookingItemRecord = {
  id: string
  booking_id: string
  service_date_from: Nullable<string>
  service_date_to: Nullable<string>
  nights: Nullable<number>
  quantity: number
  total_price: number
  price_currency: Nullable<string>
  booking: Nullable<{
    id: string
    booking_reference: string
    booking_status: Nullable<string>
    travel_date_from: Nullable<string>
    travel_date_to: Nullable<string>
  }>
}

export type ContractDetails = {
  contract: {
    id: string
    contract_number: string
    contract_name: Nullable<string>
    contract_type: Nullable<string>
    valid_from: string
    valid_to: string
    currency: Nullable<string>
    total_cost: Nullable<number>
    commission_rate: Nullable<number>
    status: Nullable<string>
    payment_terms: Nullable<string>
    cancellation_policy: Nullable<string>
    terms_and_conditions: Nullable<string>
    contract_files: Nullable<any>
    notes: Nullable<string>
    supplier: Nullable<RelatedSupplier>
    event: Nullable<RelatedEvent>
    owner: Nullable<RelatedUser>
    created_at: string
    updated_at: string
  }
  allocations: Array<ContractAllocationRecord & {
    availabilitySummary: {
      totalAvailable: number
      totalBooked: number
      totalRemaining: number
      nextAvailabilityDate: Nullable<string>
    }
    upcomingAvailability: AvailabilityRow[]
  }>
  supplierRates: SupplierRateRecord[]
  recentBookings: BookingItemRecord[]
  auditTrail: Array<{
    id: string
    entity_type: string
    entity_id: string
    action: string
    changed_at: string
    changed_by: Nullable<string>
    changed_by_user: Nullable<RelatedUser>
    old_values: Nullable<Record<string, any>>
    new_values: Nullable<Record<string, any>>
  }>
  loadErrors: {
    allocations: boolean
    supplierRates: boolean
    bookings: boolean
    auditLog: boolean
  }
}

export const contractsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().default(""),
})

async function getCurrentUserOrg() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  const { data: appUser } = await supabase
    .from("users")
    .select("id,organization_id,is_active")
    .eq("auth_id", user.id)
    .maybeSingle()

  if (appUser?.organization_id && appUser.is_active !== false) {
    return { userId: user.id, userTableId: appUser.id, organization_id: appUser.organization_id as string }
  }

  return { userId: user.id, userTableId: appUser?.id, organization_id: null }
}

export async function getContractsPage(params: z.infer<typeof contractsQuerySchema>) {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) {
    return { rows: [], total: 0 }
  }

  const supabase = await createClient()
  const { page, pageSize, q } = params
  const offset = (page - 1) * pageSize

  let query = supabase
    .from("contracts")
    .select(
      `
      *,
      event:events (
        event_name,
        event_code
      ),
      supplier:suppliers (
        id,
        name,
        code
      )
    `,
      { count: "exact" }
    )
    .eq("organization_id", auth.organization_id)

  // Search filter
  if (q) {
    query = query.or(`contract_number.ilike.%${q}%,contract_name.ilike.%${q}%`)
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1)

  const { data: rows, error, count } = await query

  if (error) {
    console.error("getContractsPage error:", error)
    throw error
  }

  return {
    rows: rows || [],
    total: count || 0,
  }
}

export async function getContractDetails(contractId: string): Promise<ContractDetails | null> {
  const auth = await getCurrentUserOrg()
  if (!auth || !auth.organization_id) {
    return null
  }

  const supabase = await createClient()

  const isPresent = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined
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
        console.info(`[ContractDetails] ${context} relation missing`, payload)
      }
      return
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[ContractDetails] ${context} query error`, payload)
    }
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`
      *,
      supplier:suppliers (
        id,
        name,
        code,
        email,
        phone
      ),
      event:events (
        id,
        event_name,
        event_code,
        event_date_from,
        event_date_to,
        city,
        country
      ),
      owner:users!contracts_created_by_fkey (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq("organization_id", auth.organization_id)
    .eq("id", contractId)
    .maybeSingle()

  if (contractError) {
    console.error("getContractDetails contract error", contractError)
    throw contractError
  }

  if (!contract) {
    return null
  }

  const [allocationsRes, supplierRatesRes, bookingItemsRes, auditLogRes] = await Promise.all([
    supabase
      .from("contract_allocations")
      .select("*")
      .eq("contract_id", contract.id)
      .eq("organization_id", auth.organization_id)
      .order("valid_from", { ascending: true }),
    supabase
      .from("supplier_rates")
      .select("*")
      .eq("contract_id", contract.id)
      .eq("organization_id", auth.organization_id)
      .order("valid_from", { ascending: true }),
    supabase
      .from("booking_items")
      .select("id, booking_id, service_date_from, service_date_to, nights, quantity, total_price, price_currency")
      .eq("contract_id", contract.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("audit_log")
      .select(`
        id,
        entity_type,
        entity_id,
        action,
        changed_at,
        changed_by,
        old_values,
        new_values,
        changed_by_user:users!audit_log_changed_by_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", auth.organization_id)
      .eq("entity_type", "contract")
      .eq("entity_id", contract.id)
      .order("changed_at", { ascending: false })
      .limit(20),
  ])

  logPostgrestError("allocations", allocationsRes.error)
  logPostgrestError("supplier_rates", supplierRatesRes.error)
  logPostgrestError("booking_items", bookingItemsRes.error)
  logPostgrestError("audit_log", auditLogRes.error)

  const rawAllocations = allocationsRes.error ? [] : ((allocationsRes.data || []) as RawContractAllocation[])
  const rawSupplierRates = supplierRatesRes.error ? [] : ((supplierRatesRes.data || []) as RawSupplierRate[])
  const rawBookingItems = bookingItemsRes.error ? [] : ((bookingItemsRes.data || []) as RawBookingItem[])
  const rawAuditLogs = auditLogRes.error ? [] : auditLogRes.data || []

  const loadErrors = {
    allocations: !!allocationsRes.error,
    supplierRates: !!supplierRatesRes.error,
    bookings: !!bookingItemsRes.error,
    auditLog: !!auditLogRes.error,
  }

  const allocationIds = rawAllocations.map((allocation) => allocation.id)
  const allocationIdsFromRates = rawSupplierRates.map((rate) => rate.contract_allocation_id).filter(isPresent)
  const allAllocationIds = Array.from(new Set([...allocationIds, ...allocationIdsFromRates]))

  const productIds = Array.from(
    new Set([
      ...rawAllocations.map((allocation) => allocation.product_id).filter(isPresent),
      ...rawSupplierRates.map((rate) => rate.product_id).filter(isPresent),
    ])
  )

  const productOptionIds = Array.from(
    new Set([
      ...rawAllocations.map((allocation) => allocation.product_option_id).filter(isPresent),
      ...rawSupplierRates.map((rate) => rate.product_option_id).filter(isPresent),
    ])
  )

  const bookingIds = Array.from(new Set(rawBookingItems.map((item) => item.booking_id).filter(isPresent)))

  let availabilityRows: AvailabilityRow[] = []
  let releasesRows: AllocationRelease[] = []

  if (allAllocationIds.length > 0) {
    const availabilityRes = await supabase
      .from("availability")
      .select("id, contract_allocation_id, date, total_available, booked, available, is_closed")
      .in("contract_allocation_id", allAllocationIds)
      .order("date", { ascending: true })
      .limit(200)

    logPostgrestError("availability", availabilityRes.error)

    availabilityRows = availabilityRes.error ? [] : ((availabilityRes.data || []) as AvailabilityRow[])

    const releasesRes = await supabase
      .from("allocation_releases")
      .select("id, contract_allocation_id, release_date, release_percentage, release_quantity, penalty_applies, notes")
      .in("contract_allocation_id", allAllocationIds)
      .order("release_date", { ascending: true })

    logPostgrestError("allocation_releases", releasesRes.error)

    releasesRows = releasesRes.error ? [] : ((releasesRes.data || []) as AllocationRelease[])
  }

  let products: ProductRecord[] = []
  if (productIds.length > 0) {
    const productsRes = await supabase
      .from("products")
      .select("id, name, code, product_type_id")
      .in("id", productIds)

    logPostgrestError("products", productsRes.error)

    products = productsRes.error ? [] : ((productsRes.data || []) as ProductRecord[])
  }

  let productOptions: ProductOptionRecord[] = []
  if (productOptionIds.length > 0) {
    const productOptionsRes = await supabase
      .from("product_options")
      .select("id, option_name, option_code")
      .in("id", productOptionIds)

    logPostgrestError("product_options", productOptionsRes.error)

    productOptions = productOptionsRes.error ? [] : ((productOptionsRes.data || []) as ProductOptionRecord[])
  }

  let productTypes: ProductTypeRecord[] = []
  const productTypeIds = Array.from(new Set(products.map((product) => product.product_type_id).filter(isPresent)))
  if (productTypeIds.length > 0) {
    const productTypesRes = await supabase
      .from("product_types")
      .select("id, type_name, type_code")
      .in("id", productTypeIds)

    logPostgrestError("product_types", productTypesRes.error)

    productTypes = productTypesRes.error ? [] : ((productTypesRes.data || []) as ProductTypeRecord[])
  }

  let bookings: BookingRecord[] = []
  if (bookingIds.length > 0) {
    const bookingsRes = await supabase
      .from("bookings")
      .select("id, booking_reference, booking_status, travel_date_from, travel_date_to")
      .in("id", bookingIds)

    logPostgrestError("bookings", bookingsRes.error)

    bookings = bookingsRes.error ? [] : ((bookingsRes.data || []) as BookingRecord[])
  }

  const availabilityByAllocation = availabilityRows.reduce<Record<string, AvailabilityRow[]>>((acc, row) => {
    if (!acc[row.contract_allocation_id]) {
      acc[row.contract_allocation_id] = []
    }
    acc[row.contract_allocation_id].push(row)
    return acc
  }, {})

  const releasesByAllocation = releasesRows.reduce<Record<string, AllocationRelease[]>>((acc, release) => {
    if (!acc[release.contract_allocation_id]) {
      acc[release.contract_allocation_id] = []
    }
    acc[release.contract_allocation_id].push(release)
    return acc
  }, {})

  Object.values(releasesByAllocation).forEach((list) => {
    list.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
  })

  const productMap = new Map(products.map((product) => [product.id, product]))
  const productTypeMap = new Map(productTypes.map((type) => [type.id, type]))
  const productOptionMap = new Map(productOptions.map((option) => [option.id, option]))
  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]))

  const buildProductDetails = (productId: Nullable<string>) => {
    if (!productId) return null
    const product = productMap.get(productId)
    if (!product) return null
    const productType = product.product_type_id ? productTypeMap.get(product.product_type_id) ?? null : null
    return {
      id: product.id,
      name: product.name,
      code: product.code ?? null,
      product_type: productType
        ? {
            id: productType.id,
            type_name: productType.type_name,
            type_code: productType.type_code,
          }
        : null,
    }
  }

  const buildProductOptionDetails = (productOptionId: Nullable<string>) => {
    if (!productOptionId) return null
    const option = productOptionMap.get(productOptionId)
    if (!option) return null
    return {
      id: option.id,
      option_name: option.option_name,
      option_code: option.option_code ?? null,
    }
  }

  const allocationsWithAvailability = rawAllocations.map((allocation) => {
    const availability = [...(availabilityByAllocation[allocation.id] || [])]
    availability.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const summary = availability.reduce(
      (acc, row) => {
        acc.totalAvailable += row.total_available ?? 0
        acc.totalBooked += row.booked ?? 0
        acc.totalRemaining += row.available ?? 0
        if (!acc.nextAvailabilityDate && row.available > 0) {
          acc.nextAvailabilityDate = row.date
        }
        return acc
      },
      {
        totalAvailable: 0,
        totalBooked: 0,
        totalRemaining: 0,
        nextAvailabilityDate: null as Nullable<string>,
      }
    )

    if (!summary.nextAvailabilityDate && availability[0]) {
      summary.nextAvailabilityDate = availability[0].date
    }

    const releases = [...(releasesByAllocation[allocation.id] || [])]

    const base: ContractAllocationRecord = {
      id: allocation.id,
      allocation_name: allocation.allocation_name ?? null,
      allocation_type: allocation.allocation_type ?? null,
      total_quantity: allocation.total_quantity ?? null,
      valid_from: allocation.valid_from,
      valid_to: allocation.valid_to,
      notes: allocation.notes ?? null,
      product: buildProductDetails(allocation.product_id),
      product_option: buildProductOptionDetails(allocation.product_option_id),
      releases,
    }

    return {
      ...base,
      availabilitySummary: summary,
      upcomingAvailability: availability.slice(0, 5),
    }
  })

  const allocationLookup = rawAllocations.reduce<Record<string, { id: string; allocation_name: Nullable<string> }>>((acc, allocation) => {
    acc[allocation.id] = {
      id: allocation.id,
      allocation_name: allocation.allocation_name ?? null,
    }
    return acc
  }, {})

  const supplierRates = rawSupplierRates.map((rate) => {
    const productDetails = buildProductDetails(rate.product_id)
    const productOptionDetails = buildProductOptionDetails(rate.product_option_id)
    const allocationRef = rate.contract_allocation_id ? allocationLookup[rate.contract_allocation_id] ?? null : null

    return {
      id: rate.id,
      rate_name: rate.rate_name ?? null,
      rate_basis: rate.rate_basis,
      valid_from: rate.valid_from,
      valid_to: rate.valid_to,
      base_cost: rate.base_cost ?? null,
      currency: rate.currency,
      markup_type: rate.markup_type ?? null,
      markup_amount: rate.markup_amount ?? null,
      pricing_details: rate.pricing_details ?? null,
      is_active: rate.is_active ?? null,
      product: productDetails
        ? {
            id: productDetails.id,
            name: productDetails.name,
            code: productDetails.code,
          }
        : null,
      product_option: productOptionDetails,
      contract_allocation: allocationRef || null,
    }
  }) as SupplierRateRecord[]

  const recentBookings = rawBookingItems.map((item) => ({
    id: item.id,
    booking_id: item.booking_id,
    service_date_from: item.service_date_from ?? null,
    service_date_to: item.service_date_to ?? null,
    nights: item.nights ?? null,
    quantity: item.quantity ?? 0,
    total_price: item.total_price ?? 0,
    price_currency: item.price_currency ?? null,
    booking: bookingMap.get(item.booking_id) ?? null,
  })) as BookingItemRecord[]

  const auditTrail = rawAuditLogs.map((log: any) => {
    const changedByRaw = (log as any).changed_by_user
    const changedByUser = Array.isArray(changedByRaw) ? changedByRaw[0] ?? null : changedByRaw ?? null

    return {
      id: log.id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: log.action,
      changed_at: log.changed_at,
      changed_by: (log as any).changed_by ?? null,
      changed_by_user: changedByUser as Nullable<RelatedUser>,
      old_values: (log.old_values || null) as Nullable<Record<string, any>>,
      new_values: (log.new_values || null) as Nullable<Record<string, any>>,
    }
  })

  return {
    contract: {
      id: contract.id,
      contract_number: contract.contract_number,
      contract_name: contract.contract_name ?? null,
      contract_type: contract.contract_type ?? null,
      valid_from: contract.valid_from,
      valid_to: contract.valid_to,
      currency: contract.currency ?? null,
      total_cost: contract.total_cost ?? null,
      commission_rate: contract.commission_rate ?? null,
      status: contract.status ?? null,
      payment_terms: contract.payment_terms ?? null,
      cancellation_policy: contract.cancellation_policy ?? null,
      terms_and_conditions: contract.terms_and_conditions ?? null,
      contract_files: contract.contract_files ?? null,
      notes: contract.notes ?? null,
      supplier: (contract.supplier as Nullable<RelatedSupplier>) ?? null,
      event: (contract.event as Nullable<RelatedEvent>) ?? null,
      owner: (contract.owner as Nullable<RelatedUser>) ?? null,
      created_at: contract.created_at,
      updated_at: contract.updated_at,
    },
    allocations: allocationsWithAvailability,
    supplierRates,
    recentBookings,
    auditTrail,
    loadErrors,
  }
}

