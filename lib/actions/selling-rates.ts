"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/audit/audit-log"

type AuthContext = {
  userId: string
  userTableId: string | null
  organization_id: string
}

const sellingRateSchema = z.object({
  product_id: z.string().uuid(),
  product_option_id: z.string().uuid().optional().nullable(),
  rate_name: z.string().trim().optional().nullable(),
  rate_basis: z.string().trim().min(1, "Rate basis is required"),
  pricing_model: z.string().trim().min(1, "Pricing model is required"),
  valid_from: z.coerce.date(),
  valid_to: z.coerce.date(),
  base_price: z.coerce.number().min(0),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be 3 letters")
    .transform((value) => value.toUpperCase()),
  markup_type: z.string().trim().optional().nullable(),
  markup_amount: z.coerce.number().optional().nullable(),
  pricing_details: z.any().optional(),
  target_cost: z.coerce.number().optional().nullable(),
  is_active: z.boolean().optional().default(true),
})

const duplicateSuffixSchema = z.object({
  rate_name: z.string().nullable().optional(),
  rate_basis: z.string(),
})

export type SellingRateInput = z.input<typeof sellingRateSchema>
export type SellingRatePayload = z.output<typeof sellingRateSchema>

async function getCurrentUserOrg(): Promise<AuthContext | null> {
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
    return {
      userId: user.id,
      userTableId: appUser.id,
      organization_id: appUser.organization_id as string,
    }
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle()

  if (membership?.organization_id) {
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()

    return {
      userId: user.id,
      userTableId: userRow?.id ?? null,
      organization_id: membership.organization_id as string,
    }
  }

  return null
}

async function ensureProductOwnership(productId: string, organizationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Product not found or access denied")
  }
}

function normalizePayload(values: SellingRateInput): SellingRatePayload {
  const parsedResult = sellingRateSchema.safeParse(values)
  if (!parsedResult.success) {
    console.error("sellingRate payload validation failed", parsedResult.error.flatten())
    throw new Error("Invalid selling rate payload")
  }

  const parsed = parsedResult.data
  const normalizedPricing: Record<string, any> =
    typeof parsed.pricing_details === "object" && parsed.pricing_details !== null ? parsed.pricing_details : {}

  if (parsed.valid_to < parsed.valid_from) {
    throw new Error("valid_to must be greater than or equal to valid_from")
  }

  return {
    ...parsed,
    rate_name: parsed.rate_name?.trim() || null,
    markup_type: parsed.markup_type?.trim() || null,
    pricing_details: normalizedPricing,
    is_active: parsed.is_active ?? true,
    target_cost: typeof parsed.target_cost === "number" ? parsed.target_cost : null,
    markup_amount: typeof parsed.markup_amount === "number" ? parsed.markup_amount : null,
  }
}

function ratePaths(productId: string) {
  return [`/products/${productId}`, "/products"]
}

async function revalidateRatePaths(productId: string) {
  for (const path of ratePaths(productId)) {
    revalidatePath(path)
  }
}

export async function createSellingRate(values: SellingRateInput) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const payload = normalizePayload(values)
  await ensureProductOwnership(payload.product_id, auth.organization_id)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("selling_rates")
    .insert({
      ...payload,
      currency: payload.currency,
    })
    .select("*")
    .single()

  if (error) {
    console.error("createSellingRate error", error)
    throw new Error(error.message || "Failed to create selling rate")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "selling_rate",
    entity_id: data.id,
    action: "create",
    old_values: null,
    new_values: data,
    changed_by: auth.userTableId,
  })

  await revalidateRatePaths(payload.product_id)
  return data
}

export async function updateSellingRate(rateId: string, values: Partial<SellingRateInput>) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from("selling_rates")
    .select("*")
    .eq("id", rateId)
    .maybeSingle()

  if (fetchError || !existing) {
    throw new Error("Selling rate not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const mergedInput: SellingRateInput = {
    product_id: existing.product_id,
    product_option_id: existing.product_option_id ?? undefined,
    rate_name: values.rate_name ?? existing.rate_name ?? undefined,
    rate_basis: values.rate_basis ?? existing.rate_basis,
    pricing_model: values.pricing_model ?? existing.pricing_model,
    valid_from: values.valid_from ?? existing.valid_from,
    valid_to: values.valid_to ?? existing.valid_to,
    base_price: values.base_price ?? existing.base_price,
    currency: values.currency ?? existing.currency,
    markup_type: values.markup_type ?? existing.markup_type ?? undefined,
    markup_amount: values.markup_amount ?? existing.markup_amount ?? undefined,
    pricing_details: values.pricing_details ?? existing.pricing_details ?? undefined,
    target_cost: values.target_cost ?? existing.target_cost ?? undefined,
    is_active: values.is_active ?? existing.is_active ?? undefined,
  }

  const payload = normalizePayload(mergedInput)

  const { data, error } = await supabase
    .from("selling_rates")
    .update(payload)
    .eq("id", rateId)
    .select("*")
    .single()

  if (error) {
    console.error("updateSellingRate error", error)
    throw new Error(error.message || "Failed to update selling rate")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "selling_rate",
    entity_id: rateId,
    action: "update",
    old_values: existing,
    new_values: data,
    changed_by: auth.userTableId,
  })

  await revalidateRatePaths(payload.product_id)
  return data
}

export async function setSellingRateActiveState(rateId: string, isActive: boolean) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from("selling_rates")
    .select("*")
    .eq("id", rateId)
    .maybeSingle()

  if (fetchError || !existing) {
    throw new Error("Selling rate not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const { data, error } = await supabase
    .from("selling_rates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", rateId)
    .select("*")
    .single()

  if (error) {
    console.error("setSellingRateActiveState error", error)
    throw new Error(error.message || "Failed to update selling rate status")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "selling_rate",
    entity_id: rateId,
    action: isActive ? "activate" : "deactivate",
    old_values: existing,
    new_values: data,
    changed_by: auth.userTableId,
  })

  await revalidateRatePaths(existing.product_id)
  return data
}

export async function deleteSellingRate(rateId: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from("selling_rates")
    .select("*")
    .eq("id", rateId)
    .maybeSingle()

  if (fetchError || !existing) {
    throw new Error("Selling rate not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const { error } = await supabase.from("selling_rates").delete().eq("id", rateId)

  if (error) {
    console.error("deleteSellingRate error", error)
    throw new Error(error.message || "Failed to delete selling rate")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "selling_rate",
    entity_id: rateId,
    action: "delete",
    old_values: existing,
    new_values: null,
    changed_by: auth.userTableId,
  })

  await revalidateRatePaths(existing.product_id)
}

export async function duplicateSellingRate(rateId: string) {
  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from("selling_rates")
    .select("*")
    .eq("id", rateId)
    .maybeSingle()

  if (fetchError || !existing) {
    throw new Error("Selling rate not found")
  }

  await ensureProductOwnership(existing.product_id, auth.organization_id)

  const parsedMeta = duplicateSuffixSchema.safeParse(existing)
  const existingName = parsedMeta.success ? parsedMeta.data.rate_name : existing.rate_name
  const baseName = existingName || `${existing.rate_basis} rate`

  let name = `${baseName} (Copy)`
  let counter = 2

  while (true) {
    const { data: conflict } = await supabase
      .from("selling_rates")
      .select("id")
      .eq("product_id", existing.product_id)
      .eq("product_option_id", existing.product_option_id)
      .eq("rate_name", name)
      .limit(1)

    if (!conflict || conflict.length === 0) break
    name = `${baseName} (Copy ${counter})`
    counter += 1
  }

  const insertPayload: SellingRateInput = {
    product_id: existing.product_id,
    product_option_id: existing.product_option_id ?? undefined,
    rate_name: name,
    rate_basis: existing.rate_basis,
    pricing_model: existing.pricing_model,
    valid_from: existing.valid_from,
    valid_to: existing.valid_to,
    base_price: existing.base_price,
    currency: existing.currency,
    markup_type: existing.markup_type ?? undefined,
    markup_amount: existing.markup_amount ?? undefined,
    pricing_details: existing.pricing_details ?? undefined,
    target_cost: existing.target_cost ?? undefined,
    is_active: existing.is_active ?? undefined,
  }

  const payload = normalizePayload(insertPayload)

  const { data, error } = await supabase
    .from("selling_rates")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    console.error("duplicateSellingRate error", error)
    throw new Error(error.message || "Failed to duplicate selling rate")
  }

  await createAuditLog({
    organization_id: auth.organization_id,
    entity_type: "selling_rate",
    entity_id: data.id,
    action: "duplicate",
    old_values: existing,
    new_values: data,
    changed_by: auth.userTableId,
  })

  await revalidateRatePaths(existing.product_id)
  return data
}

export async function bulkSetSellingRatesActiveState(rateIds: string[], isActive: boolean) {
  if (!rateIds.length) return

  const auth = await getCurrentUserOrg()
  if (!auth) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("selling_rates")
    .select("*")
    .in("id", rateIds)

  if (!existing?.length) return

  const productId = existing[0].product_id
  await ensureProductOwnership(productId, auth.organization_id)

  const { data: updated, error } = await supabase
    .from("selling_rates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", rateIds)
    .select("*")

  if (error) {
    console.error("bulkSetSellingRatesActiveState error", error)
    throw new Error(error.message || "Failed to update selling rates")
  }

  for (const previous of existing) {
    const next = updated?.find((row) => row.id === previous.id)
    await createAuditLog({
      organization_id: auth.organization_id,
      entity_type: "selling_rate",
      entity_id: previous.id,
      action: isActive ? "activate" : "deactivate",
      old_values: previous,
      new_values: next ?? null,
      changed_by: auth.userTableId,
    })
  }

  await revalidateRatePaths(productId)
}

